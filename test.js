const subject = {};
const form = {
    name: subject.name || '',
    realName: subject.realName || '',
    birthYear: subject.birthYear || (subject.birthday ? subject.birthday.split('-')[0] : ''),
    birthMonth: subject.birthMonth || (subject.birthday ? subject.birthday.split('-')[1] : ''),
    birthDay: subject.birthDay || (subject.birthday ? subject.birthday.split('-')[2] : ''),
    approximateAge: subject.approximateAge || '',
    deceasedDate: subject.deceasedDate || '',
    deceasedYear: subject.deceasedYear || (subject.deceasedDate ? subject.deceasedDate.split('-')[0] : ''),
    deceasedMonth: subject.deceasedMonth || (subject.deceasedDate ? subject.deceasedDate.split('-')[1] : ''),
    deceasedDay: subject.deceasedDay || (subject.deceasedDate ? subject.deceasedDate.split('-')[2] : ''),
    snsUrl: subject.snsUrl || '',
    notes: subject.notes || '',
};

const birthdayStr = '';
const deceasedDateStr = '';
const deceasedChecked = false;
const showBirthYear = true;
const showAge = false;

const saveData = {
    ...form,
    birthday: birthdayStr,
    deceasedDate: deceasedDateStr,
    birthYear: form.birthYear || '',
    birthMonth: form.birthMonth || '',
    birthDay: form.birthDay || '',
    deceasedYear: deceasedChecked ? form.deceasedYear : '',
    deceasedMonth: deceasedChecked ? form.deceasedMonth : '',
    deceasedDay: deceasedChecked ? form.deceasedDay : '',
    showBirthYear,
    showAge,
};

for (const key in saveData) {
    if (saveData[key] === undefined) {
        console.log(`FOUND UNDEFINED: ${key}`);
    }
}
console.log(saveData);
