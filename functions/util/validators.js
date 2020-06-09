const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false
}
const isEmpty = (string) => {
    if (string.trim() === '') return true;
    else return false;
};

exports.validateSignupData = (data) => {
    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = 'O campo Email nao pode estar vazio!';
    } else if (!isEmail(data.email)) {
        errors.email = "Email deve ser um endereço Valido";
    }

    if (isEmpty(data.password)) errors.password = 'Nao deve estar vazio';
    if (data.password !== data.confirmPassword) errors.password = 'Senhas Não Coincidem';
    if (isEmpty(data.handle)) errors.handle = 'Nao deve estar vazio';



    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }

};
exports.validateLoginData = (data) => {
    let errors = {};

    if (isEmpty(data.email)) errors.email = 'Email Vazio';
    if (isEmpty(data.password)) errors.password = 'Digite a senha';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
};

exports.reduceUserDetalhes = (data) => {
    let userDetalhes = {};

    if (!isEmpty(data.bio.trim())) userDetalhes.bio = data.bio;
    if (!isEmpty(data.website.trim())) {

        if (data.website.trim().substring(0, 4) !== 'http') {
            userDetalhes.website = `http://${data.website.trim()}`;
        } else userDetalhes.website = data.website;
    }
    if (!isEmpty(data.location.trim())) userDetalhes.location = data.location;

    return userDetalhes;

}