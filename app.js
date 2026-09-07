
    function showScreen(screenId) {

        document.querySelectorAll(".screen")
            .forEach(screen => {
                screen.classList.remove("active");
            });

        document.getElementById(screenId)
            .classList.add("active");


        document.querySelectorAll(".nav-item")
            .forEach(item => {
                item.classList.remove("active");
            });


        if (screenId === "home") {
            document.querySelectorAll(".nav-item")[0]
                .classList.add("active");
        }

        if (screenId === "products") {
            document.querySelectorAll(".nav-item")[1]
                .classList.add("active");
        }

        if (screenId === "markets") {
            document.querySelectorAll(".nav-item")[2]
                .classList.add("active");
        }

        if (screenId === "profile") {
            document.querySelectorAll(".nav-item")[3]
                .classList.add("active");
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* AI PRODUCT ANALYSIS */

    function analyzeProduct(event) {

        const file = event.target.files[0];

        if (!file) return;


        const loading =
            document.getElementById("loading");

        const result =
            document.getElementById("catalogResult");

        const preview =
            document.getElementById("previewImage");


        const reader = new FileReader();

        reader.onload = function(e) {

            preview.src = e.target.result;

        };

        reader.readAsDataURL(file);


        loading.style.display = "block";

        result.style.display = "none";


        /* Simulate AI processing */

        setTimeout(() => {

            loading.style.display = "none";

            result.style.display = "block";

        }, 2000);

    }


    /* PRICE RECOMMENDATION */

    function showPrice() {

        document.getElementById("priceResult")
            .style.display = "block";

        document.getElementById("priceResult")
            .scrollIntoView({
                behavior: "smooth"
            });

    }