({
    startRedirect: function(event) {
        let navEvent = $A.get('e.force:navigateToSObject');
        let assessmentId = event.getParams('detail').assessmentId;
        navEvent.setParams({
            recordId: assessmentId
        });
        navEvent.fire();
    }
});