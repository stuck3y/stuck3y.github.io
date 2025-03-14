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
            const iframeContainer = productClone.querySelector(".iframe-container");
            const iframe = productClone.querySelector(".search-results-iframe");

            let queryURL = '';
            if (searchEngine === "google") {
                queryURL = `https://www.google.com/search?q=${encodeURIComponent(productName)}`;
            } else if (searchEngine === "amazon") {
                queryURL = `https://www.amazon.com/s?k=${encodeURIComponent(productName)}`;
            }

            // Display the iframe with the search results
            iframe.src = queryURL;
            iframeContainer.style.display = 'block';
        });

        const addLinksBtn = productClone.querySelector(".add-links-btn");
        addLinksBtn.addEventListener("click", function() {
            const iframe = productClone.querySelector(".search-results-iframe");
            const selectedLinksList = productClone.querySelector(".selected-links");

            // Allow the user to manually copy and add URLs
            const url = iframe.src; // Assume the iframe will show search results
            if (url) {
                const li = document.createElement("li");
                li.textContent = url;
                selectedLinksList.appendChild(li);
            }
        });
    });
});
