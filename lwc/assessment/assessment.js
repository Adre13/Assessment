import {LightningElement, track, wire} from 'lwc';
import getUsers from '@salesforce/apex/AssessmentController.getUsers';
import manualSharing from '@salesforce/apex/AssessmentController.manualSharing';
import getJobLevelValues from '@salesforce/apex/AssessmentController.getJobLevelValues';
import {createRecord, getRecord} from 'lightning/uiRecordApi';
import {getObjectInfo, getPicklistValues} from 'lightning/uiObjectInfoApi';
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import Id from '@salesforce/user/Id';
import USER_POSITION_VALUES from '@salesforce/schema/User.Job_Level__c';
import ASSESSMENT_OBJECT from '@salesforce/schema/Assessment__c';
import ASSESSMENT_NAME from '@salesforce/schema/Assessment__c.Name';
import CURRENT_SALARY from '@salesforce/schema/Assessment__c.Current_Salary__c';
import EXPECTED_SALARY from '@salesforce/schema/Assessment__c.Expected_Salary__c';
import EXPECTED_JOB_LEVEL from '@salesforce/schema/Assessment__c.Expected_Job_Level__c';
import ASSESSMENT_DATE from '@salesforce/schema/Assessment__c.Assessment_Date__c';
import USER_IN_ASSESSMENT_OBJECT from '@salesforce/schema/UserInAssessment__c';
import U_IN_A_PICKLIST_VALUES from '@salesforce/schema/UserInAssessment__c.Examiner__c';
import U_IN_A_PARENT_ID from '@salesforce/schema/UserInAssessment__c.Assessment__c';
import U_IN_A_ATTITUDE from '@salesforce/schema/UserInAssessment__c.Attitude__c';
import U_IN_A_EXAMINER from '@salesforce/schema/UserInAssessment__c.Examiner__c';
import U_IN_A_USER from '@salesforce/schema/UserInAssessment__c.User__c';
import CONTENT_OBJECT from '@salesforce/schema/ContentVersion';
import CONTENT_TITLE from '@salesforce/schema/ContentVersion.Title';
import CONTENT_PATH from '@salesforce/schema/ContentVersion.PathOnClient';
import CONTENT_VERSION_DATA from '@salesforce/schema/ContentVersion.VersionData';
import CONTENT_IS_MAJOR from '@salesforce/schema/ContentVersion.IsMajorVersion';
import CONTENT_PUBLISH_LOC_ID from '@salesforce/schema/ContentVersion.FirstPublishLocationId';
import CONTENT_SHARING from '@salesforce/schema/ContentVersion.SharingPrivacy';
import assessment_date from '@salesforce/label/c.Assessment_Date';
import attachment from '@salesforce/label/c.Attachment';
import attitude from '@salesforce/label/c.Attitude';
import create_assessment from '@salesforce/label/c.Create_Assessment';
import examiner from '@salesforce/label/c.Examiner';
import add_examiner from '@salesforce/label/c.Add_Examiner';
import remove_examiner from '@salesforce/label/c.Remove_Examiner';
import file_name from '@salesforce/label/c.File_name';
import hr_label from '@salesforce/label/c.HR';
import test_taker from '@salesforce/label/c.Test_Taker';
import salary_is_changing from '@salesforce/label/c.Salary_is_Changing';
import actual_salary from '@salesforce/label/c.Actual_Salary';
import expected_salary from '@salesforce/label/c.Expected_Salary';
import close from '@salesforce/label/c.Close';
import delete_selected from '@salesforce/label/c.Delete_Selected';
import current_job_level from '@salesforce/label/c.Current_Job_Level';
import expected_job_level from '@salesforce/label/c.Expected_Job_Level';

const TEST_TAKER = 'Test Taker';
const HR = 'HR';
const EXAMINER = 'Examiner';

export default class Assessment extends LightningElement {

    userId = Id;
    users;
    usersList = [];
    currentInputId = '';
    MAX_FILE_SIZE = 50000000;
    contentVersionId;
    assessmentDate;
    testTakerId;
    label = {
        assessment_date,
        attachment,
        attitude,
        create_assessment,
        examiner,
        file_name,
        salary_is_changing,
        current_job_level,
        expected_job_level,
        hr_label,
        test_taker,
        actual_salary,
        expected_salary,
        add_examiner,
        remove_examiner,
        close,
        delete_selected
    };
    @track attachedFile;
    @track attitude = [];
    @track jobLevel = [];
    @track actualJobLevel;
    @track expectedJobLevel;
    @track examiners = [{
        id: '',
        name: '',
        attitude: '',
        position: 0
    }];
    @track testTaker = {
        id: '',
        name: '',
        attitude: TEST_TAKER
    };
    @track userHR = {
        id: '',
        name: '',
        attitude: HR
    };
    @track showUsersList = false;
    @track showSalary = false;
    @track disableRemoveButton = true;
    @track searchUsersList = [];
    @track actualSalary = 0;
    @track expectedSalary = 0;
    @track attachedFileName = '';
    @track showLoadingSpinner = false;

    @wire(getUsers) wiredUsers({data, error}) {
        if (data) {
            this.users = data;
            Object.keys(this.users).forEach(key => {
                this.usersList.push({
                    key: key,
                    value: this.users[key].name + ' <' + this.users[key].email + '>'
                });
            });
            this.userHR.name = this.users[this.userId].name;
            this.userHR.id = this.userId;
        } else if (error) {
            let message = error.body.message + '. StackTrace: ' + error.body.stackTrace;
            this.showNotification(message, 'error', 'sticky');
        }
    }

    @wire(getObjectInfo, {objectApiName: USER_IN_ASSESSMENT_OBJECT}) userInAssessmentInfo;

    @wire(getPicklistValues, {recordTypeId: '$userInAssessmentInfo.data.defaultRecordTypeId', fieldApiName: U_IN_A_PICKLIST_VALUES}) wiredPickListValues({data, error}) {
        if (data) {
            this.attitude = data.values;
        } else if (error) {
            let message = error.body.message + '. StackTrace: ' + error.body.stackTrace;
            this.showNotification(message, 'error', 'sticky');
        }
    };

    @wire(getJobLevelValues) wiredJobLevels({error, data}) {
        if (data) {
            let tempVariable = [];
            data.forEach(item => {
                tempVariable.push({
                    label: item,
                    value: item
                })
            });
            this.jobLevel = tempVariable;
        } else if (error) {
            let message = error.body.message + '. StackTrace: ' + error.body.stackTrace;
            this.showNotification(message, 'error', 'sticky');
        }
    }

    @wire(getRecord, {recordId: '$testTakerId', fields: USER_POSITION_VALUES}) wiredPosition({data, error}) {
        if (data) {
            this.actualJobLevel = data.fields.Job_Level__c.value;
            this.expectedJobLevel = data.fields.Job_Level__c.value;
        } else if (error) {
            let message = error.body.message + '. StackTrace: ' + error.body.stackTrace;
            this.showNotification(message, 'error', 'sticky');
        }
    }

    handleShowSalary() {
        this.showSalary = !this.showSalary;
        this.actualSalary = 0;
        this.expectedSalary = 0;
    }

    handleActualSalary(event) {
        this.actualSalary = event.target.value;
    }

    handleExpectedSalary(event) {
        this.expectedSalary = event.target.value;
    }

    handleJobLevelChange(event) {
        this.expectedJobLevel = event.target.value;
    }

    findUser(event) {
        this.searchUsersList = [];
        let inputValue = event.target.value;
        this.showUsersList = true;
        this.usersList.forEach(item => {
            if (item.value.includes(inputValue)) {
                this.searchUsersList.push(item);
            }
        });
    }

    handleComboboxChange(event) {
        let examinerPosition = parseInt(event.target.dataset.id, 10);
        this.examiners[examinerPosition].attitude = event.target.value;
    }

    handleInputFocused(event) {
        this.searchUsersList = this.usersList;
        this.showUsersList = true;
        this.currentInputId = event.target.dataset.id;
    }

    closeUsersList() {
        this.showUsersList = false;
        this.searchUsersList = [];
    }

    bindSelectedUser(event) {
        let selectedUserId = event.target.selectedItem;
        if (this.currentInputId === 'testTaker') {
            this.testTaker.id = selectedUserId;
            this.testTaker.name = this.users[selectedUserId].name;
            this.testTakerId = selectedUserId;
        } else if (this.currentInputId === 'userHR') {
            this.userHR.id = selectedUserId;
            this.userHR.name = this.users[selectedUserId].name;
        } else {
            this.examiners[parseInt(this.currentInputId, 10)].id = selectedUserId;
            this.examiners[parseInt(this.currentInputId, 10)].name = this.users[selectedUserId].name;
        }
        this.showUsersList = false;
        this.searchUsersList = [];
    }

    handleAddExaminer() {
        this.examiners.push(
            {id: '', name: '', attitude: '', position: this.examiners.length}
        );
        this.disableRemoveButton = false;
    }

    handleRemoveExaminer() {
        this.examiners.pop();
        if (this.examiners.length === 1) {
            this.disableRemoveButton = true;
        }
    }

    handleAssessmentDate(event) {
        this.assessmentDate = new Date(event.target.value);
    }

    attachReview(event) {
        this.attachedFile = event.target.files[0];
        this.attachedFileName = event.target.files[0].name;
    }

    deleteAttachedFile() {
        this.attachedFile = null;
        this.attachedFileName = '';
    }

    handleCheckError() {
        let message;
        if (this.testTaker.id.length < 15) {
            message = 'Test Taker is required';
        } else if (this.userHR.id.length < 15) {
            message = 'HR is required';
        } else if (this.examiners[0].id.length < 15) {
            message = 'One Examiner required at least';
        } else if (!this.assessmentDate) {
            message = 'You have to set Assessment Date';
        } else if (this.assessmentDate < new Date()) {
            message = 'How are you going to pass assessment in the past?';
        } else if (!this.attachedFile) {
            message = 'You have to attache Review';
        } else if (this.attachedFile.size > this.MAX_FILE_SIZE) {
            message = 'File size is to long';
        } else {
            for (let i = 0; i < this.examiners.length; ++i) {
                if (this.examiners[i].id.length < 15) {
                    message = 'You chose something wrong at  "' + (i + 1) + '" Examiner position.';
                    break;
                }
                if (this.examiners[i].attitude === '') {
                    message = 'You have to choose Attitude for "' + (i + 1) + '" Examiner';
                    break;
                }
            }
        }
        if(!message) {
            message = this.checkDoubleSelectedUser();
        }
        if (message) {
            this.showNotification(message, 'error', 'sticky');
        } else {
            this.showLoadingSpinner = true;
            this.createAssessment();
        }
    }

    checkDoubleSelectedUser() {
        let listIds = [this.testTaker.id];
        let message;
        if (listIds.includes(this.userHR.id)) {
            message = 'You can\'t set HR the same as Test Taker';
        }
        if (!message) {
            for (let i = 0; i < this.examiners.length; ++i) {
                if (listIds.includes(this.examiners[i].id)) {
                    message = 'Examiner "' + (i + 1) + '" is already selected';
                    break;
                } else {
                    listIds.push(this.examiners[i].id);
                }
            }
        }
        return message;
    }

    createAssessment() {
        const fields = {};
        fields[ASSESSMENT_NAME.fieldApiName] = this.testTaker.name + ' Assessment';
        fields[CURRENT_SALARY.fieldApiName] = this.actualSalary;
        fields[EXPECTED_SALARY.fieldApiName] = this.expectedSalary;
        fields[ASSESSMENT_DATE.fieldApiName] = this.assessmentDate;
        fields[EXPECTED_JOB_LEVEL.fieldApiName] = this.expectedJobLevel;
        const recordInput = { apiName: ASSESSMENT_OBJECT.objectApiName, fields };
        createRecord(recordInput).then(assessment => {
            this.showNotification('Assessment was created', 'success', 'sticky');
            this.insertFile(assessment.id);
        }).catch(error => {
            this.showLoadingSpinner = false;
            this.showNotification(error.body.message, 'error', 'sticky');
        });
    }

    insertFile(assessmentId) {
        let fileReader = new FileReader();
        let base64;
        fileReader.onload  = (fileLoaded => {
            base64 = fileLoaded.target.result;
            base64 = base64.substring(base64.indexOf(',') + 1);
            const fields = {};
            fields[CONTENT_TITLE.fieldApiName] = this.attachedFileName;
            fields[CONTENT_PATH.fieldApiName] = this.attachedFileName;
            fields[CONTENT_VERSION_DATA.fieldApiName] = base64;
            fields[CONTENT_IS_MAJOR.fieldApiName] = true;
            fields[CONTENT_SHARING.fieldApiName] = 'P';
            fields[CONTENT_PUBLISH_LOC_ID.fieldApiName] = assessmentId;
            const contentRecord = { apiName: CONTENT_OBJECT.objectApiName, fields};
            createRecord(contentRecord).then(result => {
                this.showNotification('File was added', 'success', 'sticky');
                this.contentVersionId = result.id;
                this.createParticipants(assessmentId);
            }).catch(error => {
                this.showLoadingSpinner = false;
                this.showNotification(error.body.message, 'error', 'sticky');
            });
        });
        fileReader.readAsDataURL(this.attachedFile);
    }

    createParticipants(assessmentId) {
        let participants = this.prepareParticipants(assessmentId);
        let promises = [];
        participants.forEach(tempRecord => {
            promises.push(createRecord(tempRecord));
        });
        Promise.all(promises).then(() => {
            this.showNotification('Participants were created', 'success', 'sticky');
            this.shareAssessment(assessmentId);
        }).catch(error => {
            this.showLoadingSpinner = false;
            this.showNotification(error.body.message, 'error', 'sticky');
        });
    }

    /*
    if only HR can create Assessment, all will be ok, if not - need to implement full access to Assessment for HR
     */
    shareAssessment(assessmentId) {
        let examinerIds = [];
        this.examiners.forEach(user => {
            examinerIds.push(user.id);
        });
        let idsWrapper = {
            assessmentId: assessmentId,
            contentVersionId: this.contentVersionId,
            testTakerId: this.testTaker.id,
            examinerIds: examinerIds
        };
        manualSharing({assessmentData: JSON.stringify(idsWrapper)}).then(() => {
            this.showNotification('Assessment was shared', 'success', 'sticky');
            this.showLoadingSpinner = false;
            this.fireEvent(assessmentId);
        }).catch(error => {
            this.showLoadingSpinner = false;
            this.showNotification(error.body.message, 'error', 'sticky');
        });
    }

    prepareParticipants(assessmentId) {
        let participants = [];
        participants.push({
            apiName: USER_IN_ASSESSMENT_OBJECT.objectApiName,
            fields: {
                [U_IN_A_ATTITUDE.fieldApiName]: this.testTaker.attitude,
                [U_IN_A_PARENT_ID.fieldApiName]: assessmentId,
                [U_IN_A_USER.fieldApiName]: this.testTaker.id
            }
        });
        participants.push({
            apiName: USER_IN_ASSESSMENT_OBJECT.objectApiName,
            fields: {
                [U_IN_A_ATTITUDE.fieldApiName]: EXAMINER,
                [U_IN_A_EXAMINER.fieldApiName]: this.userHR.attitude,
                [U_IN_A_PARENT_ID.fieldApiName]: assessmentId,
                [U_IN_A_USER.fieldApiName]: this.userHR.id
            }
        });
        this.examiners.forEach(item => {
            participants.push({
                apiName: USER_IN_ASSESSMENT_OBJECT.objectApiName,
                fields: {
                    [U_IN_A_ATTITUDE.fieldApiName]: EXAMINER,
                    [U_IN_A_EXAMINER.fieldApiName]: item.attitude,
                    [U_IN_A_PARENT_ID.fieldApiName]: assessmentId,
                    [U_IN_A_USER.fieldApiName]: item.id
                }
            });
        });
        return participants;
    }

    fireEvent(assessmentId) {
        this.dispatchEvent(new CustomEvent('startredirect', {
            detail: {
                assessmentId: assessmentId
            }
        }));
    }

    showNotification(message, variant, mode) {
        this.dispatchEvent(new ShowToastEvent({
            message: message,
            variant: variant,
            mode: mode
        }));
    }
}