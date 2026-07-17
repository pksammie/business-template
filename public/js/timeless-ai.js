/*
====================================================
Timeless AI V6
Frontend → Python
====================================================
*/

class TimelessAI {

    constructor() {

        this.endpoint = "http://127.0.0.1:5000/chat";

    }

    async ask(message) {

        const response = await fetch(

            this.endpoint,

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    message

                })

            }

        );

        return await response.json();

    }

}

const ai = new TimelessAI();

export default ai;

export async function ask(message){

    return ai.ask(message);

}