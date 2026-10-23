function toggleDropdown(spanId) {
    var span = document.getElementById(spanId);
    var dropdown = document.getElementById(spanId + 'Dropdown');
    var header = document.getElementById("header")
    
    var isShowing = dropdown.classList.contains('hidden');

    // Hide all dropdowns first
    var allDropdowns = document.querySelectorAll('.dropdown-content');
    allDropdowns.forEach(function (dropdown) {
        dropdown.classList.remove('hidden');
    });

    // Set inactive of all spans
    var allSpans = document.querySelectorAll('span');
    allSpans.forEach(function (span) {
        span.classList.remove('active');
    });
    
    header.classList.remove("at_top")
    if (!isShowing) {
      header.classList.toggle("at_top")
      // Toggle active class for styling
      span.classList.toggle('active');
      // Toggle hidden class to move the dropdown vertically
      dropdown.classList.toggle('hidden');
    }
}

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  body.classList.add("fade-in");
  document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", (e) => {
      const targetUrl = link.href;
      const currentHost = window.location.hostname;
      if (targetUrl && link.hostname !== currentHost && link.target !== "_blank") {
        e.preventDefault(); 
        body.classList.remove("fade-in");
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500); 
      }
    });
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    console.log("Page cached! Skipping animations...")
    document.body.classList.add("fade-in");
    document.getElementById("bottom_border").classList.add("skip-border-anim");
    document.getElementById("top_border").classList.add("skip-border-anim");
  }
});

function centerHeader() {
    var header = document.getElementById("header");
    var headerHeight = header.offsetHeight;
    var offset = headerHeight / 2;
    header.style.transform = `translate(-50%, calc(-50% + ${offset}px))`;
}
