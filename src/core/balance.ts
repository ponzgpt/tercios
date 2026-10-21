// Todas las constantes de balance del juego. Cambia números aquí, no en la lógica.

export const TICK_MS = 100;
export const AUTOSAVE_MS = 10_000;
export const OFFLINE_CAP_S = 8 * 3600;

/** Factor de crecimiento del coste de cada unidad comprada. */
export const COST_GROWTH = 1.15;

export const UNITS = {
  piquero: { baseCost: 10, power: 1 },
  arcabucero: { baseCost: 16, power: 1.5 },
} as const;
export type UnitKind = keyof typeof UNITS;

/** Leva de reclutas: cada unidad necesita un recluta además de su equipo en ducados. */
export const RECRUIT = { baseCost: 4, growth: 1.01 };

/** Paga: ducados por segundo. Cada victoria multiplica la paga (contribuciones y botín). */
export const PAY = { base: 1, perUnit: 0.15, victoryMult: 1.75 };

/**
 * Bonus por proporción. La fracción de arcabuces ideal es 1/3 (dos picas por arcabuz).
 * Bonus = maxBonus × max(0, 1 − |fracción − ideal| / tolerancia).
 */
export const RATIO = { idealArc: 1 / 3, idealArcContramarcha: 1 / 2, tolerance: 0.12, maxBonus: 1 };

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** Victorias de la campaña necesarias para desbloquearlo. */
  unlockAt: number;
  /** Parámetro numérico del efecto; su significado depende del upgrade. */
  value: number;
}

export const UPGRADES = [
  {
    id: 'instruccion_picas',
    name: 'Instrucción de picas',
    desc: 'Los piqueros aprenden a calar la pica en escuadrón cerrado. Poder de cada piquero ×2.',
    cost: 80,
    unlockAt: 0,
    value: 2,
  },
  {
    id: 'polvora_fina',
    name: 'Pólvora de mejor calidad',
    desc: 'Pólvora de grano fino y cuerda seca. Poder de cada arcabucero ×2.',
    cost: 150,
    unlockAt: 0,
    value: 2,
  },
  {
    id: 'pagadores',
    name: 'Pagadores del ejército',
    desc: 'La paga llega a tiempo y los soldados no desertan. Paga por soldado ×2.',
    cost: 300,
    unlockAt: 0,
    value: 2,
  },
  {
    id: 'mangas',
    name: 'Mangas de arcabuceros',
    desc: 'Los arcabuceros se despliegan en mangas a los flancos del escuadrón de picas. Cada arcabucero gana +300% × la fracción de picas del tercio.',
    cost: 600,
    unlockAt: 1,
    value: 3,
  },
  {
    id: 'guarnicion',
    name: 'Picas guarnecidas',
    desc: 'Una guarnición de arcabuceros rodea el escuadrón. Cada piquero gana +300% × la fracción de arcabuces del tercio.',
    cost: 900,
    unlockAt: 1,
    value: 3,
  },
  {
    id: 'sargentos',
    name: 'Sargentos veteranos',
    desc: 'Sargentos que saben formar cualquier escuadrón. Tolerancia de la proporción ×2: el bonus aguanta desequilibrios mayores.',
    cost: 1_500,
    unlockAt: 1,
    value: 2,
  },
  {
    id: 'capitanes_leva',
    name: 'Capitanes de leva',
    desc: 'Capitanes con conducta real reclutan por los pueblos. +0.5 reclutas/s y la leva cuesta la mitad.',
    cost: 1_200,
    unlockAt: 1,
    value: 0.5,
  },
  {
    id: 'contramarcha',
    name: 'Contramarcha',
    desc: 'Las filas de arcabuceros disparan y pasan atrás a recargar. La proporción ideal pasa a 1:1 y el bonus máximo por proporción sube de +100% a +200%.',
    cost: 6_000,
    unlockAt: 2,
    value: 1,
  },
  {
    id: 'sargento_mayor',
    name: 'Sargento mayor',
    desc: 'Un sargento mayor ordena la paga según el escuadrón. El bonus de proporción también multiplica la paga.',
    cost: 4_000,
    unlockAt: 2,
    value: 1,
  },
  {
    id: 'maestre_campo',
    name: 'Maestre de campo',
    desc: 'Un maestre de campo coordina picas y arcabuces. Poder +15% por cada otra mejora comprada.',
    cost: 9_000,
    unlockAt: 2,
    value: 0.15,
  },
] as const satisfies readonly UpgradeDef[];
export type UpgradeId = (typeof UPGRADES)[number]['id'];

export interface BattleDef {
  id: string;
  name: string;
  desc: string;
  /** Poder enemigo. Con este poder la victoria es segura. */
  power: number;
  /** Ducados de botín al vencer. */
  booty: number;
}

export interface CampaignDef {
  id: string;
  name: string;
  available: boolean;
  battles: readonly BattleDef[];
}

export const CAMPAIGNS: readonly CampaignDef[] = [
  {
    id: 'flandes',
    name: 'Flandes',
    available: true,
    battles: [
      {
        id: 'jemmingen',
        name: 'Jemmingen (1568)',
        desc: 'Luis de Nassau espera tras los diques del Ems.',
        power: 40,
        booty: 200,
      },
      {
        id: 'mook',
        name: 'Mook (1574)',
        desc: 'Los hermanos Nassau avanzan por el Mosa.',
        power: 350,
        booty: 2_000,
      },
      {
        id: 'gembloux',
        name: 'Gembloux (1578)',
        desc: 'El ejército de los Estados Generales se retira hacia Bruselas.',
        power: 1_500,
        booty: 0,
      },
    ],
  },
  { id: 'italia', name: 'Italia', available: false, battles: [] },
];

/**
 * Probabilidad de victoria = (poder/enemigo − minRatio) / (1 − minRatio), acotada a [0, 1].
 * Una derrota cuesta `defeatLoss` de cada tipo de unidad.
 */
export const BATTLE = { minRatio: 0.6, defeatLoss: 0.25 };

/**
 * Veteranía al licenciar el tercio = floor((poder máximo / divisor) ^ exponent). Sublineal.
 * Cada punto de veteranía ganado (en total, gastado o no) suma `prodPerPoint` al multiplicador de producción.
 */
export const PRESTIGE = { divisor: 200, exponent: 0.5, prodPerPoint: 0.5 };

export interface ShopDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  value: number;
}

export const SHOP = [
  {
    id: 'credito_fugger',
    name: 'Crédito con los Fugger',
    desc: 'Cada campaña empieza con 300 ducados y la paga base ×3.',
    cost: 1,
    value: 3,
  },
  {
    id: 'tercio_viejo',
    name: 'Núcleo de soldados viejos',
    desc: 'Cada campaña empieza con 10 piqueros y 5 arcabuceros.',
    cost: 2,
    value: 5,
  },
  {
    id: 'escuela_sargentos',
    name: 'Escuela de sargentos',
    desc: 'Tolerancia de la proporción ×1.5 para siempre.',
    cost: 3,
    value: 1.5,
  },
  {
    id: 'memoria_flandes',
    name: 'Memoria de Flandes',
    desc: 'Los armeros ya te conocen: el coste de las unidades crece ×1.12 en vez de ×1.15.',
    cost: 5,
    value: 1.12,
  },
] as const satisfies readonly ShopDef[];
export type ShopId = (typeof SHOP)[number]['id'];
export const START_DUCADOS_FUGGER = 300;
