import {
  Country,
  State,
  City,
} from "https://cdn.jsdelivr.net/npm/country-state-city@3.2.1/+esm";

export function getCountries() {
  return Country.getAllCountries();
}

export function getStates(countryCode) {
  return State.getStatesOfCountry(countryCode);
}

export function getCities(countryCode, stateCode) {
  return City.getCitiesOfState(countryCode, stateCode);
}
