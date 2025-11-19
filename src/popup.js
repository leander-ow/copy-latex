const ext = typeof browser !== 'undefined' ? browser : chrome;
const replacementsDiv = document.getElementById('replacements');
const addBtn = document.getElementById('add');
const saveBtn = document.getElementById('save');

const storage = ext.storage;

function createReplacementRow(from = '', to = '') {
  const row = document.createElement('div');
  row.className = 'replacement';

  const fromInput = document.createElement('input');
  fromInput.placeholder = 'Regex';
  fromInput.value = from;

  const toInput = document.createElement('input');
  toInput.placeholder = 'Replacement';
  toInput.value = to;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✖';
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => row.remove());

  row.append(fromInput, toInput, removeBtn);
  replacementsDiv.appendChild(row);
}

storage?.sync.get({ replacements: [] }, (data) => {
  if (data && data.replacements) {
    data.replacements.forEach(r => createReplacementRow(r.from, r.to));
  }
});

addBtn.addEventListener('click', () => createReplacementRow());

saveBtn.addEventListener('click', () => {
  const replacements = [];
  document.querySelectorAll('.replacement').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[0].value) {
      replacements.push({ from: inputs[0].value, to: inputs[1].value });
    }
  });
  storage?.sync.set({ replacements }, () => {
    alert('Saved!');
  });
});
