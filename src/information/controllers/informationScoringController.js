const brain = require('brain.js');

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
const aiModels = {};

setInterval(() => {
    Object.keys(trainingData).forEach(key => {
        const aiModel = aiModels[key] = aiModels[key] || new brain.NeuralNetwork({ activation: 'sigmoid', hiddenLayers: [6] });
        aiModel.train(trainingData[key]);
    });
}, 5000);

const getInputValueFromTrainingDataProperty = (relevantProperty, trainingItemValue, navigationId) => {
    const trainProperties = trainingProperties[navigationId] = trainingProperties[navigationId] || {};
    const trainProperty = trainProperties[relevantProperty.id] = trainProperties[relevantProperty.id] || {};
    const inputProperties = trainProperty.inputProperties = trainProperty.inputProperties || [];

    if ('string' == relevantProperty.type) {
        trainingItemValue = (trainingItemValue || '').toLowerCase().trim();
    }

    if ('boolean' == relevantProperty.type) {
        //console.log(`property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${trainingItemValue ? 1.00 : 0.00}`)
        return trainingItemValue ? 1.00 : 0.00;
    }

    const inputPropertyValues = inputProperties.filter(inputProperty => trainingItemValue == inputProperty.value);
    if (inputPropertyValues.length) {
        //console.log(`property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${inputPropertyValues[0].inputValue}`)
        return inputPropertyValues[0].inputValue;
    }

    const maximumInputValue = Math.max(...inputProperties.map(inputProperty => inputProperty.inputValue), 0);
    //console.log(`maximumInputValue: ${maximumInputValue} / maximumInputValue + 0.01: ${maximumInputValue + 0.01}`);
    const newInputProperty = { inputValue: (maximumInputValue + 0.01), value: trainingItemValue };
    inputProperties.push(newInputProperty);

    //console.log(`new property: ${relevantProperty.id} | value: ${trainingItemValue} | inputValue: ${newInputProperty.inputValue}`)

    return newInputProperty.inputValue;
};

const getInputDataFromItem = (trainingItem, navigationId) => {
    const mappingItems = trainingModelPropertyMapping.filter(mapping => mapping.navigationId == navigationId || '');
    const relevantProperties = (mappingItems.length ? mappingItems[0] : {}).relevantProperties || [];

    return relevantProperties.map(
        relevantProperty => getInputValueFromTrainingDataProperty(
            relevantProperty,
            trainingItem[relevantProperty.id],
            navigationId || ''));
};

const getInterestPredictionForItem = (item, modelId, navigationId) => {
    const aiModel = aiModels[modelId];
    if (!aiModel) {
        console.log('no trained ai model yet');
        return 1.0;
    }

    return aiModel.run(getInputDataFromItem(item, navigationId)).interest;
};

const getInterestByReferenceComparison = (trainingInputData, referenceInputData) => {
    const identicalValues = [];
    for (let i=0;i<trainingInputData.length;i++) {
        if (trainingInputData[i] == referenceInputData[i]) {
            identicalValues.push(trainingInputData[i]);
        }
    }

    return ((identicalValues.length * 100) / trainingInputData.length) / 100;
};

module.exports = () => ({
    registerTrainingData: (fastify) => {
        fastify.post('/api/training-data', async(request, reply) => {
            reply.type('application/json').code(200);

            const { modelId, navigationId } = request.query;

            const trainData = trainingData[modelId] = trainingData[modelId] || [];
            const items = (request.body || []);
            if (!items.length) {
                return;
            }

            const referenceInputData = getInputDataFromItem(items[0], navigationId);
            items.forEach(trainingItem => {
                const input = getInputDataFromItem(trainingItem, navigationId);

                trainData.push({
                    input,
                    output: {
                        interest: trainingItem.interest || getInterestByReferenceComparison(referenceInputData, getInputDataFromItem(trainingItem, navigationId))
                    }
                });
            });
        });
    },
    registerAiPredictions: (fastify) => {
        fastify.post('/api/give-predictions', async(request, reply) => {
            reply.type('application/json').code(200);

            const { modelId, navigationId } = request.query;

            let items = (request.body || []);
            items.forEach(item => {
                item.interest = getInterestPredictionForItem(item, modelId, navigationId);
                console.log(item.interest);
            });
            items.sort((a, b) => a.interest > b.interest ? -1 : 1);

            reply.send(items);

        });
    }
});
