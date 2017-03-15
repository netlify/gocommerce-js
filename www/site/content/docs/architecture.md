---
title: Architecture
position: '6'
---

# Technical Architecture

Netlify CMS is a React Application, using Redux for state management with immutable data structures (immutable.js).

The core abstractions for content editing are `collections`, `entries` and `widgets`.

Each `collection` represents a collection of entries. This can either be a collection of similar entries with the same structure, or a set of entries that each of their own structure.

The structure of an entry is defined as a series of fields, each with a `name`, a `label` and a `widget` .

The `widget` determines the UI widget that the content editor will use when editing this field of an entry, as well as how the content of the field is presented in the editing preview.

Entries are loaded and persisted through a `backend` that will typically represent a `git` repository.

## State shape / reducers
**Auth:** Keeps track of the logged state and the current user.

**Config:** Holds the environment configuration (backend type, available collections & fields).

**Collections** List of available collections, its fields and metadata information.

**Entries:** Entries for each field.

**EntryDraft:** Reused for each entry that is edited or created. It holds the entry's temporary data util it's persisted on the backend.

**Medias:** Keeps references to all media files uploaded by the user during the current session.

## Selectors:
Selectors are functions defined within reducers used to compute derived data from the Redux store. The available selectors are:

**selectEntry:** Selects a single entry, given the collection and a slug.

**selectEntries:** Selects all entries for a given collection.

**getAsset:** Selects a single AssetProxy object for the given URI:

## Value Objects:
**AssetProxy:** AssetProxy is a Value Object that holds information regarding an asset file (such as an image, for example), whether it's persisted online or hold locally in cache.

For files persisted online, the AssetProxy only keeps information about it's URI. For local files, the AssetProxy will keep a reference to the actual File object while generating the expected final URIs and on-demand blobs for local preview.

The AssetProxy object can be used directly inside a media tag (such as `<img>`), as it will always return something that can be used by the media tag to render correctly (either the URI for the online file or a single-use blob).

## Components structure and Workflows
Components are separated into two main categories: Container components and presentational components.


### Entry Editing:
For either updating an existing entry or creating a new one, the `EntryEditor` is used and the flow is the same:
- When mounted, the `EntryPage` container component dispatches the `createDraft` action, setting the `entryDraft` state to a blank state (in case of a new entry) or to a copy of the selected entry (in case of an edit).
- The `EntryPage` will also render widgets for each field type in the given entry.
- Widgets are used for editing entry fields. There are different widgets for different field types, and they are always defined in a pair containing a `control` and a `preview` components. The control component is responsible for presenting the user with the appropriate interface for manipulating the current field value, while the preview component is responsible for displaying value with the appropriate styling.

#### Widget components implementation:
The control component receives 3 callbacks as props: onChange, onAddAsset & onRemoveAsset.
  - onChange (Required): Should be called when the users changes the current value. It will ultimately end up updating the EntryDraft object in the Redux Store, thus updating the preview component.
  - onAddAsset & onRemoveAsset (optionals): If the field accepts file uploads for media (images, for example), these callbacks should be invoked with a `AssetProxy` value object. `onAddAsset` will get the current media stored in the Redux state tree while `onRemoveAsset` will remove it. AssetProxy objects are stored in the `Medias` object and referenced in the `EntryDraft` object on the state tree.

Both control and preview widgets receive a `getAsset` selector via props. Displaying the media (or its uri) for the user should always be done via `getAsset`, as it returns a AssetProxy that can return the correct value for both medias already persisted on server and cached media not yet uploaded.

The actual persistence of the content and medias inserted into the control component are delegated to the backend implementation. The backend will be called with the updated values and a a list of assetProxy objects for each field of the entry, and should return a promise that can resolve into the persisted entry object and the list of the persisted media URIs.
