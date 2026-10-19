import {createGuide} from './engine.mjs';

const form = document.querySelector('#question-form');
const input = document.querySelector('#question');
const submit = document.querySelector('#submit-button');
const panel = document.querySelector('#answer-panel');
const content = document.querySelector('#answer-content');
let answer;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sourceLink(source) {
  const link = element('a', '', `${source.title} ↗`);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function updateCount() {
  document.querySelector('#character-count').textContent = `${input.value.length} / 600`;
}

function run(question, options = {}) {
  const result = answer(question, options);
  panel.dataset.status = result.status;
  content.className = 'answer-content';
  content.replaceChildren();
  const labels = {accepted:'Accepted with conditions', separate:'Separate components', clarify:'A little more detail', unknown:'Not covered yet', not_accepted:'Not accepted here', refer:'Specialist guidance', out_of_scope:'Outside this version', information:'Published guidance'};
  content.append(element('span', 'status-chip', labels[result.status]));
  const heading = element('h2', '', result.title);
  heading.id = 'answer-heading';
  content.append(heading, element('p', 'answer-explanation', result.explanation));
  content.append(element('span', 'result-location', `Guidance scope: ${result.facility}`));
  if (result.steps.length) {
    const steps = element('ul', 'steps');
    for (const text of result.steps) {
      const item = element('li');
      item.append(element('span', '', '↳'), element('span', '', text));
      steps.append(item);
    }
    content.append(steps);
  }
  if (result.choices.length) {
    const choices = element('div', 'choices');
    for (const option of result.choices) {
      const button = element('button', 'choice-button');
      button.type = 'button';
      button.append(element('span', '', option.label), element('span', '', '→'));
      button.addEventListener('click', () => {
        input.value = option.query;
        updateCount();
        run(option.query, {cleanliness: option.cleanliness});
      });
      choices.append(button);
    }
    content.append(choices);
  }
  if (result.citations.length) {
    const evidence = element('div', 'evidence');
    evidence.append(element('p', 'eyebrow', 'CHECK THE OFFICIAL GUIDANCE'));
    for (const source of result.citations) {
      const citation = element('div', 'citation');
      citation.append(sourceLink(source), element('p', '', source.locator));
      evidence.append(citation);
    }
    content.append(evidence);
  }
  content.append(element('p', 'result-foot', 'Published guidance reviewed 19 Oct 2026. Check the current on-site label; live availability is not verified.'));
  if (window.matchMedia('(max-width: 700px)').matches) {
    panel.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }
}

function showView(view) {
  document.querySelectorAll('.view').forEach(node => {node.hidden = node.id !== `${view}-view`;});
  document.querySelectorAll('nav [data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
input.addEventListener('input', updateCount);
form.addEventListener('submit', event => {event.preventDefault(); if (answer) run(input.value);});
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => {
  input.value = button.dataset.query;
  updateCount();
  if (answer) run(input.value);
}));

async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
  return response.json();
}

try {
  const [knowledge, catalog] = await Promise.all([loadJSON('/data/knowledge_base.json'), loadJSON('/data/sources.json')]);
  answer = createGuide(knowledge, catalog);
  document.querySelector('#source-count').textContent = String(catalog.sources.length);
  const list = document.querySelector('#source-list');
  list.replaceChildren();
  for (const source of catalog.sources) {
    const card = element('article', 'source-record');
    card.append(element('span', '', source.id));
    const heading = element('h2');
    heading.append(sourceLink(source));
    card.append(heading, element('p', '', source.use), element('small', '', `${source.verification} Accessed ${source.accessed_on}.`));
    list.append(card);
  }
  input.disabled = false;
  submit.disabled = false;
  submit.firstElementChild.textContent = 'Find my next step';
  document.querySelectorAll('[data-query]').forEach(button => {button.disabled = false;});
} catch (error) {
  content.className = 'answer-content';
  const heading = element('h2', '', 'Guidance could not be loaded.');
  heading.id = 'answer-heading';
  content.replaceChildren(heading, element('p', 'error-note', 'Start the app with python3 server.py and open its Local URL. Refresh to retry.'));
  const link = element('a', '', 'Open HKU’s official guidance ↗');
  link.href = 'https://www.wastereduction.hku.hk/recycling-101';
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  content.append(link);
  document.querySelector('#source-list').replaceChildren(element('p', 'error-note', 'Sources are unavailable. Start the local server and refresh the page.'));
  submit.firstElementChild.textContent = 'Guidance unavailable';
  console.error('Research data could not be loaded.', error);
}
