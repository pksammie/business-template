import {
Country,
State,
City
}
from "country-state-city";

export function getCountries(){

    return Country.getAllCountries();

}

export function getStates(
countryCode
){

    return State.getStatesOfCountry(
        countryCode
    );

}

export function getCities(
countryCode,
stateCode
){

    return City.getCitiesOfState(
        countryCode,
        stateCode
    );

}