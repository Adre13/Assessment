public without sharing class AssessmentHelper {

    private static final String TEST_TAKER = 'Test Taker';

    public class UserWrapper {
        private User actualUser;
        @AuraEnabled public Id id {
            get {
                return actualUser.Id;
            }
        }
        @AuraEnabled public String name {
            get {
                return actualUser.Name;
            }
        }
        @AuraEnabled public String email {
            get {
                return actualUser.Email;
            }
        }
        @AuraEnabled public Id managerId {
            get {
                return actualUser.ManagerId;
            }
        }
        public UserWrapper(User actualUser) {
            this.actualUser = actualUser;
        }
    }

    public static List<String> getJobLevelValues() {

        List<String> result = new List<String>();
        List<Schema.PicklistEntry> jobLevels = User.Job_Level__c.getDescribe().getPicklistValues();

        for (Schema.PicklistEntry item: jobLevels) {
            result.add(item.value);
        }

        return result;
    }

    public class QuestionWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String body;
        @AuraEnabled public Boolean answer;
        public QuestionWrapper(Question__c actualQuestion) {
            this.id = actualQuestion.Id;
            this.body = actualQuestion.Body__c;
            this.answer = actualQuestion.Answered__c;
        }
    }

    private class ShareWrapper {
        public String assessmentId { get; set; }
        public String contentVersionId { get; set; }
        public String testTakerId { get; set; }
        public List<String> examinerIds { get; set;}
    }

    public static Map<Id, UserWrapper> getUsers() {

        List<User> users = [
            SELECT Id, Name, Email, ManagerId
            FROM User
            WHERE IsActive = TRUE
        ];

        Map<Id, UserWrapper> userWrapperMap = new Map<Id, UserWrapper>();

        for (User temp : users) {
            userWrapperMap.put(temp.Id, new UserWrapper(temp));
        }

        return userWrapperMap;
    }

//    public static List<QuestionWrapper> getAssessmentQuestions(String assessmentId, String userId) {
//
//        Boolean testTaker = false;
//        List<QuestionWrapper> questionWrappers = new List<QuestionWrapper>();
//        List<UserInAssessment__c> checkIsTestTaker = [
//            SELECT Attitude__c
//            FROM UserInAssessment__c
//            WHERE Assessment__c = :assessmentId AND User__c = :userId
//            LIMIT 1
//        ];
//
//        if (checkIsTestTaker.size() > 0 && checkIsTestTaker[0].Attitude__c == TEST_TAKER) {
//            testTaker = true;
//        }
//
//        if (!testTaker) {
//            List<Question__c> questions = [
//                SELECT Body__c, Answered__c
//                FROM Question__c
//                WHERE Assessment__c = :assessmentId
//            ];
//
//            for (Question__c temp : questions) {
//                questionWrappers.add(new QuestionWrapper(temp));
//            }
//        }
//        return questionWrappers;
//    }

    public static void shareRecord(String shareData) {

        ShareWrapper shareWrapper = (ShareWrapper) JSON.deserialize(shareData, ShareWrapper.class);
        List<Assessment__Share> shareList = new List<Assessment__Share>();
        String assessmentId = shareWrapper.assessmentId;
        String contentVersionId = shareWrapper.contentVersionId;
        List<String> examinerIds = shareWrapper.examinerIds;

        shareList.add(new Assessment__Share(
            ParentId = assessmentId,
            UserOrGroupId = shareWrapper.testTakerId,
            AccessLevel = 'Read',
            RowCause = Schema.Assessment__Share.RowCause.Manual
        ));

        for (String examinerId: examinerIds) {
            shareList.add(new Assessment__Share(
                ParentId = assessmentId,
                UserOrGroupId = examinerId,
                AccessLevel = 'Read',
                RowCause = Schema.Assessment__Share.RowCause.Manual
            ));
        }
        insert shareList;

        ContentVersion file = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentVersionId
        ];

        List<ContentDocumentLink> shareLinks = new List<ContentDocumentLink>();

        for (String examinerId: examinerIds) {
            shareLinks.add(new ContentDocumentLink(
                ContentDocumentId = file.ContentDocumentId,
                LinkedEntityId = examinerId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        insert shareLinks;

        ContentDocument contentDocument = [
            SELECT SharingOption
            FROM ContentDocument
            WHERE Id =: file.ContentDocumentId
        ];

        contentDocument.SharingOption = 'R';
        update contentDocument;
    }

    public static void lockRecord(String recordId) {
        Approval.lock(recordId);
    }

}