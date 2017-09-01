module.exports = {
    children: [
        'shim'
    ],
    services: [
        'configuration',
        'migrate',

        'source/activity',
        'source/sync'
    ]
};
