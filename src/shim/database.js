import IsNil from 'lodash-es/isNil';


export default class Database {
    constructor(userId) {
        this.userId = userId;

        this._db = null;
    }

    open() {
        if(IsNil(window.indexedDB)) {
            return Promise.reject(new Error(
                'IndexedDB API is not available'
            ));
        }

        if(IsNil(this.userId)) {
            return Promise.reject(new Error('' +
                'Invalid User ID'
            ));
        }

        return new Promise((resolve, reject) => {
            let request = window.indexedDB.open('music_' + this.userId);

            request.onsuccess = () => {
                this._db = request.result;

                // Resolve promise
                resolve();
            };

            request.onerror = () => {
                this._db = null;

                // Reject promise with error
                reject(request.error);
            };
        });
    }

    all(name) {
        if(IsNil(this._db)) {
            return Promise.reject(new Error(
                'Database hasn\'t been opened yet'
            ));
        }

        return new Promise((resolve) => {
            let items = {};

            // Open object store transaction
            let store = this._db.transaction(name).objectStore(name);

            // Retrieve items from object store
            store.openCursor().onsuccess = (event) => {
                let cursor = event.target.result;

                if(!IsNil(cursor)) {
                    items[cursor.key] = cursor.value;

                    // Retrieve next item
                    cursor.continue();
                } else {
                    // Resolve promise with items
                    resolve(items);
                }
            };
        });
    }
}
