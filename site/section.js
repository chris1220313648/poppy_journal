async function loadData() {
  const res = await fetch('./data.json');
  return res.json();
}

const section = document.body.dataset.section;

loadData().then(data => {
  const map = {
    travel: data.site.sections.travel,
    photography: data.site.sections.photography,
    outdoor: data.site.sections.outdoor
  };
  const titleMap = {
    travel: 'Travel',
    photography: 'Photography',
    outdoor: 'Outdoor'
  };

  document.querySelector('#section-title').textContent = titleMap[section] || 'Gallery';
  document.querySelector('#section-desc').textContent = map[section] || '';

  const items = data.galleries[section] || [];
  document.querySelector('#gallery-grid').innerHTML = items.map(src => `<img src="${src}" alt="${section}">`).join('');
});
