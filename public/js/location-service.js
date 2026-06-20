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

const lagosLGAs = [
  "Agege",
  "Ajeromi-Ifelodun",
  "Alimosho",
  "Amuwo-Odofin",
  "Apapa",
  "Badagry",
  "Epe",
  "Eti-Osa",
  "Ibeju-Lekki",
  "Ifako-Ijaiye",
  "Ikeja",
  "Ikorodu",
  "Kosofe",
  "Lagos Island",
  "Lagos Mainland",
  "Mushin",
  "Ojo",
  "Oshodi-Isolo",
  "Shomolu",
  "Surulere",
];

export function getCities(countryCode, stateCode) {
  if (
    countryCode === "NG" &&
    stateCode === "LA"
  ) {
    return lagosLGAs.map((city) => ({
      name: city,
    }));
  }

  return City.getCitiesOfState(
    countryCode,
    stateCode
  );
}