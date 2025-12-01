// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});

// Collapsible "Recent Talks" toggle
(function () {
  function initToggle(btn) {
    const targetSel = btn.getAttribute('data-target');
    const list = document.querySelector(targetSel);
    if (!list) return;

    const hidden = Array.from(list.querySelectorAll('.more-item'));
    let expanded = false;

    function update() {
      hidden.forEach(li => (li.style.display = expanded ? 'list-item' : 'none'));
      btn.textContent = expanded ? 'Show less...' : 'Show more...';
    }

    // show only first ~6 talks by default
    update();

    btn.addEventListener('click', () => {
      expanded = !expanded;
      update();
    });
  }

  document.querySelectorAll('.toggle').forEach(initToggle);
})();
