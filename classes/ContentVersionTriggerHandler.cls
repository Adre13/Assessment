public with sharing class ContentVersionTriggerHandler {

    public static void preventFileAddingForAssessment(List<ContentVersion> incomingFiles) {

        Id currentUserId = UserInfo.getUserId();
        List<Id> firstPublishLocIds = new List<Id>();

        for (ContentVersion file: incomingFiles) {
            firstPublishLocIds.add(file.FirstPublishLocationId);
        }

        Map<Id, Assessment__c> actualAssessments = new Map<Id, Assessment__c>([
            SELECT Id, OwnerId
            FROM Assessment__c
            WHERE Id IN: firstPublishLocIds
        ]);

        for (ContentVersion file: incomingFiles) {
            if (actualAssessments.containsKey(file.FirstPublishLocationId)) {
                if (!Approval.isLocked(file.FirstPublishLocationId)) {
                    if (actualAssessments.get(file.FirstPublishLocationId).OwnerId != currentUserId) {
                        file.addError('Add file can only Owner');
                    }
                } else {
                    file.addError('Assessment is already closed.');
                }
            }
        }
    }

    public static void preventAdditionalFileSharingForAssessment(List<ContentVersion> incomingFiles) {

        String assessmentKeyPrefix = Assessment__c.SObjectType.getDescribe().getKeyPrefix();

        for (ContentVersion file: incomingFiles) {
            String firstPubLocationId = file.FirstPublishLocationId;
            if (firstPubLocationId.startsWith(assessmentKeyPrefix)) {
                file.SharingPrivacy = 'P';
            }
        }
    }

}