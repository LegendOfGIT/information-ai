const HTTP_STATUS_CODE_INTERNAL_ERROR = 500;
const HTTP_STATUS_CODE_OK = 200;

const replyWithInternalError = (reply, errorMessage, additionalInformation) => {

    reply.code(HTTP_STATUS_CODE_INTERNAL_ERROR);
    return reply.send(Object.assign({ errorMessage }, additionalInformation));

};

const trainingModelPropertyMapping = [
    {
        navigationId: 'MULTIMEDIA_GAMES',
        relevantProperties: [
            { id: 'genre', type: 'string' },
            { id: 'subgenre', type: 'string' },
            { id: 'minimumAge', type: 'number' },
            { id: 'multiplayer', type: 'boolean' },
        ]
    }
];

const trainingProperties = {};
const trainingData = {};

const getInputValueFromTrainingDataProperty = (relevantProperty, trainingItemValue, navigationId) => {
    const trainProperties = trainingProperties[navigationId] = trainingProperties[navigationId] || {};
    const trainProperty = trainProperties[relevantProperty.id] = trainProperties[relevantProperty.id] || {};
    const inputProperties = trainProperty.inputProperties = trainProperty.inputProperties || [];

    if ('string' == relevantProperty.type) {
        trainingItemValue = (trainingItemValue || '').toLowerCase().trim();
    }

    if ('boolean' == relevantProperty.type) {
        console.log(`property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${trainingItemValue ? 1.00 : 0.00}`)
        return trainingItemValue ? 1.00 : 0.00;
    }

    const inputPropertyValues = inputProperties.filter(inputProperty => trainingItemValue == inputProperty.value);
    if (inputPropertyValues.length) {
        console.log(`property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${inputPropertyValues[0].inputValue}`)
        return inputPropertyValues[0].inputValue;
    }

    const maximumInputValue = Math.max(...inputProperties.map(inputProperty => inputProperty.inputValue), 0);
    console.log(`maximumInputValue: ${maximumInputValue} / maximumInputValue + 0.01: ${maximumInputValue + 0.01}`);
    const newInputProperty = { inputValue: (maximumInputValue + 0.01), value: trainingItemValue };
    inputProperties.push(newInputProperty);

    console.log(`new property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${newInputProperty.inputValue}`)

    return newInputProperty.inputValue;
};

module.exports = () => ({
    registerTrainingData: (fastify) => {
        fastify.post('/api/training-data', async(request, reply) => {
            reply.type('application/json').code(200);

            const { navigationId } = request.query;

            const mappingItems = trainingModelPropertyMapping.filter(mapping => mapping.navigationId == navigationId || '');
            const relevantProperties = (mappingItems.length ? mappingItems[0] : {}).relevantProperties || [];

            const trainData = trainingData[navigationId] = trainingData[navigationId] || [];
            (request.body || []).forEach(trainingItem => {
                const input = relevantProperties.map(relevantProperty =>
                    getInputValueFromTrainingDataProperty(
                        relevantProperty,
                        trainingItem[relevantProperty.id],
                        navigationId || ''));

                trainData.push({ input, output: { interest: trainingItem.interest }});
            });

            console.log(trainData);
        });
    }
});
