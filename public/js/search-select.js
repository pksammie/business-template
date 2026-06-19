export function createSearchSelect({

container,
placeholder,
items,
onSelect,
disabled = false

}){

container.innerHTML = "";

const wrapper =
document.createElement("div");

wrapper.className =
`search-select ${
disabled
? "search-select-disabled"
: ""
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

const trigger =
wrapper.querySelector(
".search-select-trigger"
);

const dropdown =
wrapper.querySelector(
".search-select-dropdown"
);

const search =
wrapper.querySelector(
".search-select-search"
);

const options =
wrapper.querySelector(
".search-select-options"
);

function render(list){

options.innerHTML = "";

list.forEach(item=>{

const option =
document.createElement("div");

option.className =
"search-select-option";

option.textContent =
item.name;

option.addEventListener(
"click",
()=>{

wrapper.querySelector(
".search-select-placeholder"
).textContent =
item.name;

wrapper.querySelector(
".search-select-placeholder"
).className =
"search-select-value";

wrapper.classList.remove(
"open"
);

onSelect(item);

}
);

options.appendChild(option);

});

}

render(items);

trigger.addEventListener(
"click",
()=>{

if(wrapper.classList.contains(
"search-select-disabled"
)) return;

wrapper.classList.toggle(
"open"
);

}
);

search.addEventListener(
"input",
()=>{

const value =
search.value.toLowerCase();

render(

items.filter(item=>

item.name
.toLowerCase()
.includes(value)

)

);

}
);

document.addEventListener(
"click",
e=>{

if(
!wrapper.contains(e.target)
){

wrapper.classList.remove(
"open"
);

}

}
);

return {

enable(){

wrapper.classList.remove(
"search-select-disabled"
);

},

disable(){

wrapper.classList.add(
"search-select-disabled"
);

},

setPlaceholder(text){

wrapper.querySelector(
".search-select-placeholder"
).textContent = text;

},

setItems(newItems){

items = newItems;

render(items);

}

};

}