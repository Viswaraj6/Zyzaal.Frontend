const cards = document.querySelectorAll(".product-card");

cards.forEach(card => {

    card.addEventListener("click", () => {

        alert("Product Added");

    });

});
