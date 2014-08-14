"use strict";
var factory = require("../../utils/factory"),
    deleteState
    ;

deleteState = {
    typical: function () {
        return {
            primers: [
                factory.make("typical saveState")
            ],
            main: factory.make("typical deleteState"),
            verify: factory.make("typical retrieveState")
        };
    },
    registered: function () {
        var uuid = factory.make("good UUID"),
            obj = {
                primers: [
                    factory.make("typical saveState")
                ],
                main: factory.make("typical deleteState"),
                verify: factory.make("typical retrieveState")
            };

        obj.primers[0].params.registration = uuid;
        obj.main.params.registration = uuid;
        obj.verify.params.registration = uuid;

        return obj;
    }
};

factory.register("deleteStateCluster", deleteState);