async function loadData() {
  const res = await fetch('./data.json');
  return res.json();
}

function card(item, type) {
  const link = `item.html?type=${type}&title=${encodeURIComponent(item.title)}`;
  const poster = item.poster || 'assets/placeholder.jpg';
  return `
    <a class="card" href="${link}">
      <img src="${poster}" alt="${item.title}">
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-tagline">${item.tagline || item.summary || ''}</div>
        <div class="card-meta">
          <span>Read</span>
          <span>→</span>
        </div>
      </div>
    </a>
  `;
}

function gallery(items) {
  return items.map(src => `<img src="${src}" alt="gallery">`).join('');
}

loadData().then(data => {
  document.querySelector('#hero-title').textContent = data.site.title;
  document.querySelector('#hero-subtitle').textContent = data.site.subtitle;

  const intro = document.querySelector('#intro');
  intro.innerHTML = data.site.intro.map(p => `<p class="hero-paragraph">${p}</p>`).join('');

  const identity = document.querySelector('#identity');
  identity.innerHTML = data.site.identity.map(i => `<span>${i}</span>`).join('');

  document.querySelector('#films-desc').textContent = data.site.sections.films;
  document.querySelector('#books-desc').textContent = data.site.sections.books;
  document.querySelector('#travel-desc').textContent = data.site.sections.travel;
  document.querySelector('#photo-desc').textContent = data.site.sections.photography;
  document.querySelector('#outdoor-desc').textContent = data.site.sections.outdoor;

  const filmsGrid = document.querySelector('#films-grid');
  filmsGrid.innerHTML = data.films.map(f => card(f, 'film')).join('');

  const booksGrid = document.querySelector('#books-grid');
  booksGrid.innerHTML = data.books.map(b => card(b, 'book')).join('');

  document.querySelector('#travel-grid').innerHTML = gallery(data.galleries.travel.slice(0, 6));
  document.querySelector('#photo-grid').innerHTML = gallery(data.galleries.photography.slice(0, 6));
  document.querySelector('#outdoor-grid').innerHTML = gallery(data.galleries.outdoor.slice(0, 6));
});
