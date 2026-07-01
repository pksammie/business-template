export function fireLuxuryConfetti() {

    const duration = 1800;

    const animationEnd = Date.now() + duration;

    const defaults = {

        startVelocity: 35,

        spread: 360,

        ticks: 70,

        zIndex: 9999

    };

    function random(min, max) {

        return Math.random() * (max - min) + min;

    }

    const interval = setInterval(() => {

        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {

            clearInterval(interval);

            return;

        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({

            ...defaults,

            particleCount,

            origin: {

                x: random(0.1, 0.3),

                y: random(0.2, 0.6)

            },

            colors: [

                "#c5a880",

                "#f7e7b5",

                "#ffffff"

            ]

        });

        confetti({

            ...defaults,

            particleCount,

            origin: {

                x: random(0.7, 0.9),

                y: random(0.2, 0.6)

            },

            colors: [

                "#c5a880",

                "#f7e7b5",

                "#ffffff"

            ]

        });

    },250);

}