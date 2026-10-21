import {
  AUTOSAVE_MS,
  BATTLE,
  CAMPAIGNS,
  OFFLINE_CAP_S,
  SHOP,
  UPGRADES,
  type UnitKind,
} from '../core/balance';
import {
  buyShop,
  campaignWon,
  currentCampaign,
  fight,
  nextBattle,
  prestige,
  veteraniaGain,
  winChance,
} from '../core/campaign';
import {
  arcFraction,
  buyRecruits,
  buyUnits,
  buyUpgrade,
  canBuyUpgrade,
  has,
  idealArcFraction,
  income,
  isUnlocked,
  maxRatioBonus,
  power,
  ratioBonus,
  ratioTolerance,
  recruitCost,
  recruitRate,
  tick,
  trackPower,
  unitCost,
  unitPower,
  veteranMult,
} from '../core/economy';
import { formatNumber as fmt } from '../core/format';
import { applyOffline, type OfflineReport } from '../core/offline';
import { exportSave, importSave } from '../core/save';
import { newGame, type GameState } from '../core/state';
import { button, formatDuration, h, percent, setDisabled, setText } from './dom';
import { startLoop } from './loop';
import { load, save, wipe } from './storage';

let s: GameState;
const updaters: (() => void)[] = [];
const render = (): void => updaters.forEach((u) => u());

/** Ejecuta una acción del jugador y repinta al momento. */
const act =
  (fn: () => void): (() => void) =>
  () => {
    fn();
    render();
  };

// ---------- Crónica ----------

const chronicle = h('ol', 'chronicle');
function log(text: string, tone: 'good' | 'bad' | '' = ''): void {
  const li = h('li', tone, text);
  chronicle.prepend(li);
  while (chronicle.children.length > 8) chronicle.lastElementChild?.remove();
}

// ---------- Barra de recursos ----------

function resourceBar(): HTMLElement {
  const stat = (label: string): [HTMLElement, HTMLElement, HTMLElement] => {
    const value = h('strong');
    const sub = h('small');
    return [h('div', 'stat', h('span', 'stat-label', label), value, sub), value, sub];
  };
  const [ducEl, duc, ducRate] = stat('Ducados');
  const [recEl, rec, recRate] = stat('Reclutas');
  const [powEl, pow, powSub] = stat('Poder');
  const [vetEl, vet, vetSub] = stat('Veteranía');
  updaters.push(() => {
    setText(duc, fmt(s.ducados));
    setText(ducRate, `+${fmt(income(s))}/s`);
    setText(rec, fmt(Math.floor(s.reclutas)));
    const rr = recruitRate(s);
    setText(recRate, rr > 0 ? `+${fmt(rr)}/s` : 'por leva');
    setText(pow, fmt(power(s)));
    setText(powSub, `máx. ${fmt(s.poderMaximo)}`);
    setText(vet, fmt(s.veterania));
    setText(vetSub, `paga ×${fmt(veteranMult(s))}`);
  });
  return h('div', 'resources', ducEl, recEl, powEl, vetEl);
}

// ---------- Leva y armamento ----------

const UNIT_INFO: Record<UnitKind, { plural: string; desc: string }> = {
  piquero: { plural: 'Piqueros', desc: 'Pica de 5 m y coselete. Aguantan la carga.' },
  arcabucero: { plural: 'Arcabuceros', desc: 'Arcabuz de mecha. Hacen el daño a distancia.' },
};

function recruitPanel(): HTMLElement {
  const cost = h('span', 'cost');
  const b1 = button(
    'Leva ×1',
    act(() => buyRecruits(s, 1)),
  );
  const b10 = button(
    '×10',
    act(() => buyRecruits(s, 10)),
  );
  const b100 = button(
    '×100',
    act(() => buyRecruits(s, 100)),
  );
  updaters.push(() => {
    const c = recruitCost(s);
    setText(cost, `${fmt(c)} ducados por bisoño`);
    setDisabled(b1, s.ducados < c);
    setDisabled(b10, s.ducados < c);
    setDisabled(b100, s.ducados < c);
  });
  const row = h(
    'div',
    'row',
    h(
      'div',
      'row-main',
      h('h3', '', 'Reclutas (bisoños)'),
      h('p', 'muted', 'Mozos levantados por los capitanes. Cada soldado necesita uno.'),
      cost,
    ),
    h('div', 'row-actions', b1, b10, b100),
  );

  const unitRow = (kind: UnitKind): HTMLElement => {
    const count = h('span', 'count');
    const info = h('span', 'cost');
    const one = button(
      'Armar ×1',
      act(() => buyUnits(s, kind, 1)),
    );
    const ten = button(
      '×10',
      act(() => buyUnits(s, kind, 10)),
    );
    updaters.push(() => {
      setText(count, fmt(kind === 'piquero' ? s.piqueros : s.arcabuceros));
      const c = unitCost(s, kind);
      setText(info, `${fmt(c)} ducados + 1 recluta · poder ${fmt(unitPower(s, kind))} c/u`);
      const can = s.ducados >= c && s.reclutas >= 1;
      setDisabled(one, !can);
      setDisabled(ten, !can);
    });
    return h(
      'div',
      'row',
      h(
        'div',
        'row-main',
        h('h3', '', UNIT_INFO[kind].plural, ' ', count),
        h('p', 'muted', UNIT_INFO[kind].desc),
        info,
      ),
      h('div', 'row-actions', one, ten),
    );
  };

  return h(
    'section',
    'card',
    h('h2', '', 'Leva y armamento'),
    row,
    unitRow('piquero'),
    unitRow('arcabucero'),
  );
}

// ---------- Formación (proporción) ----------

function formationPanel(): HTMLElement {
  const pikes = h('div', 'bar-pikes');
  const shot = h('div', 'bar-shot');
  const band = h('div', 'bar-band');
  const ideal = h('div', 'bar-ideal');
  const bar = h('div', 'bar', pikes, shot, band, ideal);
  const ratio = h('p', 'ratio');
  const bonus = h('p', 'bonus');
  const hint = h('p', 'muted');
  updaters.push(() => {
    const f = arcFraction(s);
    const n = s.piqueros + s.arcabuceros;
    pikes.style.width = n ? `${(1 - f) * 100}%` : '0';
    shot.style.width = n ? `${f * 100}%` : '0';
    const fi = idealArcFraction(s);
    const tol = ratioTolerance(s);
    // La barra va de picas (izquierda) a arcabuces (derecha): la posición es 1 − fracción de arcabuces.
    ideal.style.left = `${(1 - fi) * 100}%`;
    band.style.left = `${Math.max(0, 1 - fi - tol) * 100}%`;
    band.style.width = `${(Math.min(1, 1 - fi + tol) - Math.max(0, 1 - fi - tol)) * 100}%`;
    const ratioText =
      n === 0
        ? 'Sin tropa'
        : s.arcabuceros === 0
          ? 'Solo picas'
          : `${fmt(s.piqueros / s.arcabuceros)} picas por arcabuz`;
    const idealText = fi === 0.5 ? '1 por 1' : `${Math.round((1 - fi) / fi)} por 1`;
    setText(ratio, `${ratioText} · ideal ${idealText}`);
    setText(
      bonus,
      `Bonus de proporción: +${percent(ratioBonus(s))} (máx. +${percent(maxRatioBonus(s))})`,
    );
    setText(
      hint,
      n === 0
        ? 'Arma picas y arcabuces: el tercio rinde más cuanto más cerca esté de la proporción ideal.'
        : f < fi
          ? 'Faltan arcabuceros para el ideal.'
          : f > fi
            ? 'Faltan picas para el ideal.'
            : 'Proporción perfecta.',
    );
  });
  return h(
    'section',
    'card',
    h('h2', '', 'Formación del escuadrón'),
    h('div', 'bar-legend', h('span', '', 'Picas'), h('span', '', 'Arcabuces')),
    bar,
    ratio,
    bonus,
    hint,
  );
}

// ---------- Campaña y batallas ----------

function campaignPanel(): HTMLElement {
  const title = h('h2');
  const list = h('ol', 'battles');
  const items = currentCampaign.battles.map((b, i) => {
    const status = h('span', 'battle-status');
    const li = h(
      'li',
      '',
      h('div', '', h('strong', '', b.name), h('p', 'muted', b.desc)),
      h('div', 'battle-side', h('span', 'cost', `Enemigo: ${fmt(b.power)}`), status),
    );
    list.append(li);
    return { li, status, i };
  });
  const fightBtn = button(
    '',
    act(() => {
      const r = fight(s, Math.random());
      if (!r) return;
      if (r.outcome === 'victoria') {
        log(`¡Victoria en ${r.battle.name}! Botín: ${fmt(r.booty)} ducados.`, 'good');
        if (campaignWon(s))
          log('La campaña de Flandes está ganada. Puedes licenciar el tercio.', 'good');
      } else {
        log(
          `Derrota en ${r.battle.name}. Bajas: ${r.lostPiqueros} piqueros y ${r.lostArcabuceros} arcabuceros.`,
          'bad',
        );
      }
    }),
    'btn btn-primary',
  );
  const next = CAMPAIGNS.filter((c) => c !== currentCampaign).map((c) =>
    h(
      'div',
      'locked-campaign',
      h('strong', '', `Campaña de ${c.name}`),
      h('span', 'tag', c.available ? 'Disponible' : 'Próximamente'),
    ),
  );
  updaters.push(() => {
    setText(title, `Campaña de ${currentCampaign.name} · ${s.prestigios + 1}.ª vez`);
    for (const it of items) {
      const state = it.i < s.victorias ? 'won' : it.i === s.victorias ? 'next' : 'locked';
      if (it.li.dataset['state'] !== state) it.li.dataset['state'] = state;
      setText(
        it.status,
        state === 'won' ? 'Vencida ✓' : state === 'next' ? percent(winChance(s)) : 'Por llegar',
      );
    }
    const b = nextBattle(s);
    fightBtn.hidden = !b;
    if (b) {
      setText(fightBtn, `Presentar batalla · ${percent(winChance(s))} de victoria`);
      setDisabled(fightBtn, winChance(s) === 0);
    }
  });
  return h(
    'section',
    'card',
    title,
    list,
    fightBtn,
    h(
      'p',
      'muted small',
      `Con el poder enemigo la victoria es segura; por debajo del ${percent(BATTLE.minRatio)} es imposible. Una derrota cuesta el ${percent(BATTLE.defeatLoss)} de la tropa.`,
    ),
    ...next,
  );
}

// ---------- Mejoras ----------

function upgradesPanel(): HTMLElement {
  const list = h('div', 'upgrades');
  const battles = currentCampaign.battles;
  for (const u of UPGRADES) {
    const btn = button(
      `${fmt(u.cost)} ducados`,
      act(() => {
        if (buyUpgrade(s, u.id)) log(`Mejora: ${u.name}.`);
      }),
    );
    const lock = h('span', 'tag');
    const el = h(
      'div',
      'upgrade',
      h('div', 'row-main', h('h3', '', u.name), h('p', 'muted', u.desc)),
      h('div', 'row-actions', btn, lock),
    );
    list.append(el);
    updaters.push(() => {
      const owned = has(s, u.id);
      const unlocked = isUnlocked(s, u.id);
      const state = owned ? 'owned' : unlocked ? 'open' : 'locked';
      if (el.dataset['state'] !== state) el.dataset['state'] = state;
      btn.hidden = state !== 'open';
      lock.hidden = state === 'open';
      setText(
        lock,
        owned ? 'Comprada ✓' : `Tras vencer en ${battles[u.unlockAt - 1]?.name ?? '?'}`,
      );
      setDisabled(btn, !canBuyUpgrade(s, u.id));
    });
  }
  return h('section', 'card', h('h2', '', 'Mejoras del tercio'), list);
}

// ---------- Veteranía ----------

function veteranPanel(): HTMLElement {
  const preview = h('p');
  const prestigeBox = h('div', 'prestige');
  const gainText = h('p');
  const prestigeBtn = button(
    'Licenciar el tercio',
    act(() => {
      const gain = veteraniaGain(s.poderMaximo);
      const ok = confirm(
        `Licenciar el tercio: perderás ducados, tropa y mejoras, y ganarás ${gain} de veteranía. ¿Continuar?`,
      );
      if (!ok) return;
      const next = prestige(s, Date.now());
      if (!next) return;
      s = next;
      save(s);
      log(`Tercio licenciado. +${gain} de veteranía. Empieza una nueva campaña.`, 'good');
    }),
    'btn btn-primary',
  );
  prestigeBox.append(h('h3', '', 'La campaña está ganada'), gainText, prestigeBtn);
  const shop = h('div', 'upgrades');
  for (const item of SHOP) {
    const btn = button(
      `${item.cost} veteranía`,
      act(() => {
        if (buyShop(s, item.id)) log(`Mejora permanente: ${item.name}.`, 'good');
      }),
    );
    const tag = h('span', 'tag', 'Comprada ✓');
    const el = h(
      'div',
      'upgrade',
      h('div', 'row-main', h('h3', '', item.name), h('p', 'muted', item.desc)),
      h('div', 'row-actions', btn, tag),
    );
    shop.append(el);
    updaters.push(() => {
      const owned = s.tienda.includes(item.id);
      if (el.dataset['state'] !== (owned ? 'owned' : 'open'))
        el.dataset['state'] = owned ? 'owned' : 'open';
      btn.hidden = owned;
      tag.hidden = !owned;
      setDisabled(btn, s.veterania < item.cost);
    });
  }
  updaters.push(() => {
    const gain = veteraniaGain(s.poderMaximo);
    setText(
      preview,
      `Cada punto de veteranía ganado multiplica para siempre la paga y la leva (ahora ×${fmt(veteranMult(s))}). Si licenciaras el tercio tras ganar la campaña obtendrías ${gain} (según el poder máximo: ${fmt(s.poderMaximo)}).`,
    );
    prestigeBox.hidden = !campaignWon(s);
    setText(
      gainText,
      `Los soldados viejos vuelven a casa, pero su experiencia se queda. Ganarás ${gain} de veteranía y la próxima campaña irá mucho más rápido.`,
    );
  });
  return h(
    'section',
    'card',
    h('h2', '', 'Veteranía'),
    preview,
    prestigeBox,
    h('h3', 'subhead', 'Mejoras permanentes'),
    shop,
  );
}

// ---------- Partida ----------

function savePanel(): HTMLElement {
  const area = h('textarea');
  area.rows = 3;
  area.placeholder = 'Pega aquí una partida exportada para importarla.';
  area.setAttribute('aria-label', 'Texto de la partida');
  const status = h('p', 'muted small');
  const exp = button('Exportar', () => {
    s.lastSeen = Date.now();
    area.value = exportSave(s);
    area.select();
    navigator.clipboard?.writeText(area.value).then(
      () => setText(status, 'Partida copiada al portapapeles.'),
      () => setText(status, 'Copia el texto de la caja.'),
    );
  });
  const imp = button(
    'Importar',
    act(() => {
      if (!area.value.trim()) return setText(status, 'Pega primero el texto de una partida.');
      if (!confirm('Importar sustituirá tu partida actual. ¿Continuar?')) return;
      try {
        s = importSave(area.value, Date.now());
        reportOffline(applyOffline(s, Date.now()));
        save(s);
        setText(status, 'Partida importada.');
      } catch (e) {
        setText(status, e instanceof Error ? e.message : 'No se pudo importar.');
      }
    }),
  );
  const reset = button(
    'Reiniciar todo',
    act(() => {
      if (!confirm('Esto borra la partida para siempre, incluida la veteranía. ¿Seguro?')) return;
      wipe();
      s = newGame(Date.now());
      chronicle.replaceChildren();
      log('Partida reiniciada. Un puñado de bisoños harapientos espera órdenes.');
    }),
    'btn btn-danger',
  );
  return h(
    'section',
    'card',
    h('h2', '', 'Partida'),
    h('p', 'muted small', 'Se guarda sola cada 10 s y al cerrar la pestaña.'),
    area,
    h('div', 'row-actions', exp, imp, reset),
    status,
  );
}

// ---------- Mientras estabas fuera ----------

const dialog = h('dialog', 'away');
function reportOffline(r: OfflineReport): void {
  if (r.seconds < 60) return;
  dialog.replaceChildren(
    h('h2', '', 'Mientras estabas fuera'),
    h(
      'p',
      '',
      `Has estado ausente ${formatDuration(r.seconds)}${r.capped ? ` (máximo ${formatDuration(OFFLINE_CAP_S)})` : ''}.`,
    ),
    h(
      'ul',
      '',
      h('li', '', `Paga recibida: ${fmt(r.ducados)} ducados`),
      ...(r.reclutas >= 1 ? [h('li', '', `Reclutas levados: ${fmt(Math.floor(r.reclutas))}`)] : []),
    ),
    button('A las armas', () => dialog.close(), 'btn btn-primary'),
  );
  if (!dialog.open) dialog.showModal();
  log(`Ausente ${formatDuration(r.seconds)}: +${fmt(r.ducados)} ducados.`);
}

// ---------- Arranque ----------

export function mount(root: HTMLElement): void {
  s = load(Date.now());
  root.append(
    h(
      'header',
      'top',
      h('h1', '', 'Tercios'),
      h('p', 'tagline', 'De bisoños harapientos a tercio viejo'),
    ),
    resourceBar(),
    h(
      'main',
      'grid',
      h('div', 'col', recruitPanel(), formationPanel()),
      h('div', 'col', campaignPanel(), h('section', 'card', h('h2', '', 'Crónica'), chronicle)),
      h('div', 'col', upgradesPanel(), veteranPanel(), savePanel()),
    ),
    h(
      'footer',
      'foot',
      'Juego libre (MIT) · ',
      Object.assign(h('a', '', 'código'), { href: 'https://github.com/ponzgpt/tercios' }),
    ),
    dialog,
  );
  if (s.prestigios === 0 && s.victorias === 0 && s.piqueros === 0) {
    log('Un puñado de bisoños harapientos espera órdenes. Leva reclutas y ármalos.');
  }
  reportOffline(applyOffline(s, Date.now()));
  render();

  startLoop(
    (dt) => {
      tick(s, dt);
      trackPower(s);
      s.lastSeen = Date.now();
    },
    render,
    () => {
      reportOffline(applyOffline(s, Date.now()));
      render();
    },
  );
  setInterval(() => save(s), AUTOSAVE_MS);
  addEventListener('pagehide', () => save(s));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(s);
  });
}
