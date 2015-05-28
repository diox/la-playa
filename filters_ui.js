(function() {
// Find all groups
var groups = document.querySelectorAll('.btn-group');
for (var i = 0, il = groups.length; i < il; i++) {
    attachGroupBehaviour(groups[i]);
}

function attachGroupBehaviour(group) {
    group.addEventListener('click', groupBehaviour);
}

function groupBehaviour(evt) {
    if (evt.metaKey && !evt.target.dataset.buttonAll) {
        checkboxBehaviour(evt);
    } else {
        radioBehaviour(evt);
    }

    var activeValues = collectActiveValues(evt.currentTarget);

    window[evt.currentTarget.dataset.graphCallback](activeValues);
}

function radioBehaviour(evt) {
    var groupButtons = evt.currentTarget.querySelectorAll('.btn');
    for (var i = 0, il = groupButtons.length; i < il; i++) {
        groupButtons[i].classList.remove('active');
    }

    evt.target.classList.add('active');
}

function checkboxBehaviour(evt) {
    var isActive = evt.target.classList.contains('active');
    evt.target.classList.toggle('active', !isActive);

    // TODO: Improve when all or none buttons are checked
}

function collectActiveValues(group) {
    var buttonAll = group.querySelector('[data-button-all]');
    var activeButtons = [];
    var inactiveButtons = [];
    if (buttonAll && buttonAll.classList.contains('active')) {
        activeButtons = [].slice.call(group.querySelectorAll('.btn'));

    } else {
        activeButtons = [].slice.call(group.querySelectorAll('.active'));
    }

    return activeButtons.filter(function(button) {
        return !button.dataset.buttonAll;
    }).map(function(button) {
        return button.dataset.value;
    });
}

})();

function updateSeries(activeSeries) {
    varNames.forEach(function (serie) {
        var series = d3.selectAll('.' + serie);
        series.classed('inactive', activeSeries.indexOf(serie) === -1);
    });
}

function updatePaths(activePaths) {
    var paths = d3.selectAll('.line').classed('inactive', true);
    var paths = d3.selectAll('.point').classed('inactive', true);
    activePaths.forEach(function (activePath) {
        d3.selectAll('.' + activePath).classed('inactive', false);
    })
}
