async function loadData() {
  const res = await fetch('./data.json');
  return res.json();
}

function getQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type') || 'film',
    title: params.get('title') || ''
  };
}

loadData().then(data => {
  const { type, title } = getQuery();
  const list = type === 'book' ? data.books : data.films;
  const item = list.find(i => i.title === title) || list[0];

  if (!item) return;

  document.querySelector('#detail-title').textContent = item.title;
  document.querySelector('#detail-tagline').textContent = item.tagline || '';
  document.querySelector('#detail-summary').textContent = item.summary || '';
  document.querySelector('#detail-thoughts').textContent = item.thoughts || '';
  document.querySelector('#detail-image').src = item.poster || 'assets/placeholder.jpg';

  const backLink = document.querySelector('#back-link');
  backLink.href = 'index.html#' + (type === 'book' ? 'books' : 'films');
});
