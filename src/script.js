const baseUrl = "https://v5.bvg.transport.rest";
const stopId = "900000181503";
const resultCount = 6;

let container;
let template;
let nowTemplate;

let isValidAspectRatio;
let nodeCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
    container = document.querySelector("main");
    template = document.querySelector("#departure");
    nowTemplate = document.querySelector("#now");

    await checkAspectRatio();
    setInterval(refreshDepartures, 30 * 1000); // Refresh every 30 seconds
});

window.addEventListener("resize", debounce(checkAspectRatio, 500));
window.addEventListener("orientationchange", debounce(checkAspectRatio, 500));

async function checkAspectRatio() {
    const {width, height} = window.visualViewport;

    if (width / height < 1.2) {
        displayError("Only viewports with aspect ratios bigger than 1.2 are supported");
        isValidAspectRatio = false;
        return;
    }

    if (!isValidAspectRatio) {
        isValidAspectRatio = true;
        clearContent();
        await refreshDepartures();
    }
}

function displayError(error) {
    clearContent();
    const errorNode = document.querySelector("#error").content.cloneNode(true);
    errorNode.querySelector("p.error").innerText = error;
    container.append(errorNode);
}

function clearContent() {
    nodeCount = 0;
    container.innerHTML = "";
}

async function refreshDepartures() {
    if (!isValidAspectRatio)
        return;

    const departures = await fetchDepartures();
    departures.forEach(showDeparture);
    removeOutdatedNodes();
}

function removeOutdatedNodes() {
    if (nodeCount === resultCount)
        return;
    const remove = container.querySelector("article:first-of-type");
    remove.classList.add("fade");
    setTimeout(() => {
        container.removeChild(remove);
        nodeCount--;
        removeOutdatedNodes();
    }, 1000);
}

async function fetchDepartures() {
    const response = await fetch(`${baseUrl}/stops/${stopId}/departures?duration=120&results=${resultCount}`);
    const departures = await response.json();
    return departures.map(d => {
        return {
            id: d.tripId,
            type: d.line.product,
            name: d.line.name,
            destination: d.direction,
            minsUntilDeparture: getDepartureTime(d.when)
        };
    });
}

function showDeparture(departure) {
    let node = findDepartureNode(departure.id);
    if (node !== null) {
        // Update existing node
        setDepartureTime(node, departure);
    } else {
        // Create new node
        node = createDepartureNode(departure);
        nodeCount++;
    }
    container.append(node);
}

function findDepartureNode(departureId) {
    return container.querySelector(`[data-departure-id="${departureId}"]`);
}

function createDepartureNode(departure) {
    const node = template.content.cloneNode(true);

    const icon = node.querySelector(".line-info img");
    icon.setAttribute("src", `icons/${departure.type}.svg`);
    icon.setAttribute("alt", `${departure.type} icon`);

    node.querySelector(".line-info span").innerHTML = departure.name;
    node.querySelector(".destination").innerHTML = departure.destination;

    setDepartureTime(node, departure);

    node.querySelector("article").dataset.departureId = departure.id;

    return node;
}

function setDepartureTime(node, departure) {
    const departureTimeNode = node.querySelector(".departure-time");
    if (departure.minsUntilDeparture <= 0) {
        departureTimeNode.innerHTML = "";
        const now = nowTemplate.content.cloneNode(true);
        departureTimeNode.classList.add("now");
        departureTimeNode.append(now);
    } else {
        departureTimeNode.innerHTML = departure.minsUntilDeparture + "'";
    }
}

function getDepartureTime(departureDate) {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    const differenceMillis = new Date(departureDate).getTime() - now.getTime();
    return differenceMillis / 1000 / 60;
}

function debounce(func, wait) {
    let timeout;
    return function() {
        const self = this;
        const args = arguments;
        const hasTimeout = !!timeout;
        clearTimeout(timeout);
        timeout = setTimeout(() => timeout = null, wait);
        if (!hasTimeout)
            func.apply(self, args);
    };
}
