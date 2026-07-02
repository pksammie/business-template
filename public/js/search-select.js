export function createSearchSelect({
  container,
  placeholder,
  items,
  onSelect,
  disabled = false,
}) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");

  wrapper.className = `search-select ${
    disabled ? "search-select-disabled" : ""
  }`;

  wrapper.innerHTML = `
<div class="search-select-trigger">

<span class="search-select-placeholder">
${placeholder}
</span>

<i class="fa-solid fa-chevron-down search-select-arrow"></i>

</div>

<div class="search-select-dropdown">

<input
type="text"
class="search-select-search"
placeholder="Search..."
>

<div class="search-select-options"></div>

</div>
`;

  container.appendChild(wrapper);

  const trigger = wrapper.querySelector(".search-select-trigger");

  const dropdown = wrapper.querySelector(".search-select-dropdown");

  const search = wrapper.querySelector(".search-select-search");

  const options = wrapper.querySelector(".search-select-options");

  function render(list) {
    options.innerHTML = "";

    list.forEach((item) => {
      const option = document.createElement("div");

      option.className = "search-select-option";

      option.textContent = item.name;

      option.addEventListener("click", () => {
        const label = wrapper.querySelector(
          ".search-select-placeholder, .search-select-value",
        );

        if (label) {
          label.textContent = item.name;

          label.className = "search-select-value";
        }

        wrapper.classList.remove("open");

        onSelect(item);
      });

      options.appendChild(option);
    });
  }

  render(items);

  trigger.addEventListener("click", () => {
    if (wrapper.classList.contains("search-select-disabled")) return;

    wrapper.classList.toggle("open");
  });

  search.addEventListener("input", () => {
    const value = search.value.toLowerCase();

    render(items.filter((item) => item.name.toLowerCase().includes(value)));
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("open");
    }
  });

  return {
    clear() {
      search.value = "";

      const placeholderElement = wrapper.querySelector(
        ".search-select-placeholder, .search-select-value",
      );

      if (placeholderElement) {
        placeholderElement.textContent = placeholder;

        placeholderElement.className = "search-select-placeholder";
      }

      render(items);
    },

    enable() {
      wrapper.classList.remove("search-select-disabled");
    },

    disable() {
      wrapper.classList.add("search-select-disabled");

      wrapper.classList.remove("open");

      search.value = "";

      const placeholderElement = wrapper.querySelector(
        ".search-select-placeholder, .search-select-value",
      );

      if (placeholderElement) {
        placeholderElement.textContent = placeholder;

        placeholderElement.className = "search-select-placeholder";
      }
    },

    setPlaceholder(text) {
      const placeholderElement = wrapper.querySelector(
        ".search-select-placeholder, .search-select-value",
      );

      if (placeholderElement) {
        placeholderElement.textContent = text;

        placeholderElement.className = "search-select-placeholder";
      }
    },

    setItems(newItems) {
      items = newItems;

      render(items);
    },

    select(name) {

    const item = items.find(i => i.name === name);

    if (!item) return;

    const label = wrapper.querySelector(
        ".search-select-placeholder, .search-select-value"
    );

    label.textContent = item.name;

    label.className = "search-select-value";

    onSelect(item);

}
  };
}
