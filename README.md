# Vendor API

This JSON-ld api enables vendors to fully manage their process lifecycle within the OPH database. Endpoints support creating new processes, updating existing process metadata, and uploading corresponding process diagrams to ensure seamless integration and up-to-date documentation.

# Useful links

- [Swagger api documentation](https://dev.openproceshuis.lblod.info/api/docs/)
- [Datamodel](https://abb-vlaanderen.gitbook.io/informatie-oph/linked-datamodel/datamodel)

# Resources

**Process** Process resources can be created and edited through this API. We do limit editing processes by only allowing editing processes that have been created by this service.
**File** The file uris used for building up the process resource originate from the file-service

# Errors

Errors are created with resource type `oph:Error`. Depending on the threshold an grace period the extra `ERROR_RESOURCE_TYPE_URI` type is added to the resource object. When the class is added this can then trigger a delta message to interact with other services.

> Error resources will only be created when the status code of the error was lower or equal than 400 and higher or equal than 500

| Environment variable          | Values        | Default value                                               | Explanation                                                                                                            |
| ----------------------------- | ------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ERROR_RESOURCE_TYPE_URI       | URI as string | "http://open-services.net/ns/core#Error"                    | Type uri of the error resource. This uri can be used to trigger delta events.                                          |
| ERROR_GRAPH_URI               | URI as string | "http://mu.semte.ch/graphs/errors"                          | Single graph URI where the error resources will be stored.                                                             |
| ERROR_GRACE_PERIOD_IN_MINUTES | Number        | 5                                                           | Time window where errors need to occur, in combination with the threshold environment.                                 |
| ERROR_THRESHOLD_OCCURRENCES   | Number        | 2                                                           | Amount of errors that need to be triggered in the grace period to add the resource type uri to the error.              |
| SEND_MAIL_ON_THRESHOLD        | true / false  | false                                                       | If previous threshold and/or grace period are set this environment will override adding the error resource class uri.  |
| ERROR_CREATOR_URI             | URI as string | "http://lblod.data.gift/services/oph/vendor-api"            | URI that will be set on the error resource as creator. In this usecase we want to know its from our vendor-api-service |
| ERROR_URI_PREFIX              | URI as string | "http://lblod.data.gift/vocabularies/openproceshuis/error/" | The base uri that will be used when creating the error resources.                                                      |

1. Update the environments of the service in your compose file

```yml
vendor-api:
  environment:
    ERROR_RESOURCE_TYPE_URI: 'http://open-services.net/ns/core#Error' # Same as the delta rule error-alert
    ERROR_GRAPH_URI: 'http://mu.semte.ch/graphs/integration/vendor-api/errors'
    ERROR_GRACE_PERIOD_IN_MINUTES: 1
    ERROR_THRESHOLD_OCCURRENCES: 1
    SEND_MAIL_ON_THRESHOLD: true
```

2. Update the authorization config to handle the new resource classes

```lisp
(define-prefixes
  :oph "http://lblod.data.gift/vocabularies/openproceshuis/"
  :os "http://open-services.net/ns/core#")

(define-graph error ("http://mu.semte.ch/graphs/errors")
  ("os:Error" -> _)
  ("oph:Error" -> _))
```

3. Make sure the app is up to date with the `loket-error-alert-service` & `deliver-email-service`

- https://github.com/lblod/loket-error-alert-service
- https://github.com/redpencilio/deliver-email-service
