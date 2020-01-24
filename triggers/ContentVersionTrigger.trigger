trigger ContentVersionTrigger on ContentVersion (before insert, after insert) {

    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            ContentVersionTriggerHandler.preventAdditionalFileSharingForAssessment(Trigger.new);
        }
    }

    if (Trigger.isAfter) {
        if (Trigger.isInsert) {
            ContentVersionTriggerHandler.preventFileAddingForAssessment(Trigger.new);
        }
    }
}