Feature: statement structure object group test

Scenario:

    Given a [type] saveStatement request
    Given the statement object is changed to a [object]
    When the request is made
    Then the request was successful

    Where:
        type    | object
        typical | mboxAndType group
        typical | mboxSha1AndType group
        typical | openidAndType group
        typical | accountAndType group

Scenario:

    Given a [type] saveStatement request
    Given the statement object is changed to a [object]
    Given the statement object [property] is changed to [value]
    When the request is made
    Then the LRS responds with HTTP [HTTP]

    Where:
        HTTP | type    | object                                | property                  | value
        400  | typical | mboxAndType group                     | mbox                      | test@tincan.edu
        400  | typical | mboxAndType group                     | mbox                      | bad mbox
        400  | typical | mboxAndType group                     | objectType                | notGroup
        400  | typical | allPropertiesMboxAgentMember group    | member 0 mbox             | test@tincan.edu
        400  | typical | allPropertiesMboxAgentMember group    | member 0 mbox             | bad mbox

@Pending
Scenario:

    Given a [type] saveStatement request
    Given the statement object is changed to a [object]
    Given the statement object [property] is set to [value]
    When the request is made
    Then the LRS responds with HTTP [HTTP]

    Where:
        HTTP | type    | object                                                  | property                   | value
        400  | typical | accountAndType group                                    | account homePage           | bad homePage
        400  | typical | mboxAndType group                                       | objectType                 | group
        400  | typical | openidAndType group                                     | openid                     | bad openid
        400  | typical | allPropertiesOpenidAgentMember group                    | member 0 openid            | bad openid
        400  | typical | allPropertiesAccountAgentMember group                   | member 0 account homePage  | bad homePage

Scenario:

    Given a [type] saveStatement request
    Given the statement object is changed to a [object]
    Given the statement object [property] is removed
    When the request is made
    Then the LRS responds with HTTP [HTTP]

    Where:
        HTTP | type    | object                             | property
        400  | typical | mboxAndType group                  | objectType
        400  | typical | mboxAndType group                  | mbox
        400  | typical | mboxSha1AndType group              | mbox_sha1sum
        400  | typical | openidAndType group                | openid
        400  | typical | accountAndType group               | account
        400  | typical | accountAndType group               | account name
        400  | typical | accountAndType group               | account homePage
        400  | typical | allPropertiesMboxAgentMember group | objectType
