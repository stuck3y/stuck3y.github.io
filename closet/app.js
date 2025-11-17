document.addEventListener("DOMContentLoaded", function() {
    const addProductButton = document.getElementById("add-product-btn");
    const productList = document.getElementById("product-list");
    const productTemplate = document.getElementById("product-template");

    addProductButton.addEventListener("click", function() {
        const productClone = productTemplate.cloneNode(true);
        productClone.style.display = "block";
        productList.appendChild(productClone);

        const searchBtn = productClone.querySelector(".search-btn");
        searchBtn.addEventListener("click", function() {
            const productName = productClone.querySelector(".product-name").value;
            const searchEngine = productClone.querySelector(".search-engine").value;

            let queryURL = '';
            if (searchEngine === "google") {
                queryURL = `https://www.google.com/search?q=${encodeURIComponent(productName)}`;
            } else if (searchEngine === "amazon") {
                queryURL = `https://www.amazon.com/s?k=${encodeURIComponent(productName)}`;
            }

            // Open the search results in a new tab
            window.open(queryURL, '_blank');
        });

        const addLinksBtn = productClone.querySelector(".add-links-btn");
        addLinksBtn.addEventListener("click", function() {
            const selectedLinksList = productClone.querySelector(".selected-links");

            // Assume user manually copies and pastes URLs into the list
            const url = productClone.querySelector(".product-name").value;
            if (url) {
                const li = document.createElement("li");
                li.textContent = url;
                selectedLinksList.appendChild(li);
            }
        });
    });
});
