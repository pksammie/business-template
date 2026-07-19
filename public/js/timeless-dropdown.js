// timeless-dropdown.js
//
// A single-select, Timeless-styled dropdown for simple option lists
// (sort order, rating filter, status filter, category, time ranges...).
// Reuses the same visual classes as the searchable picker used in
// checkout (search-select-trigger/dropdown/options) so it looks
// identical without needing new CSS. Use createSearchSelect instead
// when the list is long enough to need typing to filter it.
//
// Usage:
//   const dd = createDropdown({
//     container: document.getElementById("mount"),
//     options: [{ value: "newest", label: "Newest First" }, ...],
//     value: "newest",
//     onChange: (value) => { ... },
//   });
//   dd.setValue("price-asc");
//   dd.setOptions(newOptions);

export function createDropdown({
  container,
  options = [],
  value = null,
  placeholder = "Select",
  onChange = () => {},
  disabled = false,
}) {

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = `search-select timeless-dropdown ${disabled ? "search-select-disabled" : ""}`;

  wrapper.innerHTML = `
    <div class="search-select-trigger">
      <span class="search-select-placeholder"></span>
      <i class="fa-solid fa-chevron-down search-select-arrow"></i>
    </div>
    <div class="search-select-dropdown">
      <div class="search-select-options"></div>
    </div>
  `;

  container.appendChild(wrapper);

  const trigger = wrapper.querySelector(".search-select-trigger");
  const label = wrapper.querySelector(".search-select-placeholder");
  const optionsList = wrapper.querySelector(".search-select-options");

  let currentValue = value;
  let currentOptions = options;

  function renderLabel() {
    const match = currentOptions.find(o => o.value === currentValue);
    if (match) {
      label.textContent = match.label;
      label.className = "search-select-value";
    } else {
      label.textContent = placeholder;
      label.className = "search-select-placeholder";
    }
  }

  function renderOptions() {
    optionsList.innerHTML = "";

    currentOptions.forEach(opt => {
      const item = document.createElement("div");
      item.className = "search-select-option";

      if (opt.html) {
        item.innerHTML = opt.html;
      } else {
        item.textContent = opt.label;
      }

      if (opt.value === currentValue) {
        item.classList.add("search-select-option-active");
      }

      item.addEventListener("click", () => {
        currentValue = opt.value;
        renderLabel();
        wrapper.classList.remove("open");
        onChange(currentValue);
      });

      optionsList.appendChild(item);
    });
  }

  trigger.addEventListener("click", () => {
    if (disabled) return;
    wrapper.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("open");
    }
  });

  renderLabel();
  renderOptions();

  return {
    getValue: () => currentValue,
    setValue(v) {
      currentValue = v;
      renderLabel();
      renderOptions();
    },
    setOptions(newOptions) {
      currentOptions = newOptions;
      renderLabel();
      renderOptions();
    },
    close() {
      wrapper.classList.remove("open");
    },
  };
}