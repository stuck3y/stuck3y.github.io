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

            const query = `${searchEngine === "google" ? "https://www.google.com/search?q=" : "https://www.amazon.com/s?k="}${encodeURIComponent(productName)}`;
            fetchSearchResults(query, productClone);
        });

        const addLinksBtn = productClone.querySelector(".add-links-btn");
        addLinksBtn.addEventListener("click", function() {
            const selectedLinks = productClone.querySelectorAll(".search-results input:checked");
            const selectedLinksList = productClone.querySelector(".selected-links");
            selectedLinks.forEach(link => {
                const li = document.createElement("li");
                li.textContent = link.value;
                selectedLinksList.appendChild(li);
            });
        });
    });

    function fetchSearchResults(query, productElement) {
        fetch(query)
            .then(response => response.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const results = doc.querySelectorAll(".tF2Cxc"); // Google's search result container
                const resultList = productElement.querySelector(".search-results");
                resultList.innerHTML = "";

                results.forEach(result => {
                    const link = result.querySelector("a");
                    const label = result.querySelector(".LC20lb");
                    if (link && label) {
                        const listItem = document.createElement("li");
                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.value = link.href;
                        listItem.appendChild(checkbox);
                        listItem.appendChild(document.createTextNode(label.textContent));
                        resultList.appendChild(listItem);
                    }
                });
            })
            .catch(error => console.error("Error fetching search results:", error));
    }
});
