import './ui/styles.css';
import { mount } from './ui/app';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) mount(root);
