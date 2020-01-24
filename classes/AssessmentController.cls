public with sharing class AssessmentController {

    @InvocableMethod
    public static void changeHrAccess(List<String> assessmentIds) {
        AssessmentHelper.lockRecord(assessmentIds[0]);
    }

    @AuraEnabled(Cacheable=true)
    public static Map<Id, AssessmentHelper.UserWrapper> getUsers() {
        return AssessmentHelper.getUsers();
    }

//    @AuraEnabled(Cacheable=true)
//    public static List<AssessmentHelper.QuestionWrapper> getQuestions(String assessmentId, String userId) {
//        return AssessmentHelper.getAssessmentQuestions(assessmentId, userId);
//    }

    @AuraEnabled(Cacheable=true)
    public static List<String> getJobLevelValues() {
        return AssessmentHelper.getJobLevelValues();
    }

    @AuraEnabled
    public static void manualSharing(String assessmentData) {
        AssessmentHelper.shareRecord(assessmentData);
    }

}