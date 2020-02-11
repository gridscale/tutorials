var xhr = new XMLHttpRequest();
xhr.overrideMimeType("application/json");
xhr.open('GET', 'settings.json', true);
xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == "200") {
        // settings loaded
        var settings = JSON.parse(xhr.responseText);
        document.getElementById('companyName').textContent = settings.companyName;
    }
};
xhr.send(null);
