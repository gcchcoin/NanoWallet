import Network from '../utils/Network';
import helpers from '../utils/helpers';
import Nodes from '../utils/nodes';

class AppHeaderCtrl {
    constructor(AppConstants, Alert, $localStorage, $translate, Wallet, $scope, $location, Connector, DataBridge, $filter) {
        'ngInject';

        // Navbar app name
        this.appName = AppConstants.appName;

        // Application constants
        this._AppConstants = AppConstants;
        // Local storage
        this._storage = $localStorage;
        // Alert service
        this._Alert = Alert;
        // Translation service
        this._$translate = $translate;
        // Wallet service
        this._Wallet = Wallet;
        // Connector service
        this._Connector = Connector;
        // DataBridge service
        this._DataBridge = DataBridge;
        // $location to redirect
        this._$location = $location;
        // Filters
        this._$filter = $filter;

        // Set nodes for current and selected
        this.currentNode = undefined;
        this.customNode = undefined;

        // Available languages
        this.languages = AppConstants.languages;

        this.currentAccountMosaicNames = [];

        /**
         * Watch if a wallet is set and set the right nodes
         */
        $scope.$watch('Wallet.current', (val) => {
            if (!val) {
                return;
            }

            // Show right nodes list according to network
            if (Wallet.network == Network.data.Mainnet.id) {
                this.nodes = Nodes.mainnetNodes;
            } else if (Wallet.network == Network.data.Testnet.id) {
                this.nodes = Nodes.testnetNodes;
            } else {
                this.nodes = Nodes.mijinNodes;
            }

            // Get default node
            this.currentNode = Wallet.node;

            // Set wallet name
            this.walletName = val.name;

            // Init account mosaics
            this.updateCurrentAccountMosaics();

        });

        /**
         * Fix dropdown closing if click on select
         */
        $(document).on('click', '.navbar .container-fluid li .dropdown-menu', function(e) {
            e.stopPropagation();
        });

    }

    /**
     * purge() Reset data from localstorage
     */
    purge() {
        if (confirm(this._$filter('translate')('HEADER_PURGE_MESSAGE')) == true) {
           this._storage.wallets = [];
            this._Alert.successPurge();
        } else {
            this._Alert.purgeCancelled();
        }
    }

    /**
     * logout() Delete current wallet stored in Wallet service and redirect to home logged out
     */
    logout() {
        // Close connector
        this._DataBridge.connector.close();
        // Set connection status to false
        this._DataBridge.connectionStatus = false;
        // Show success alert
        this._Alert.successLogout();
        // Reset data in DataBridge service
        this._DataBridge.reset();
        // Reset data in Wallet service
        this._Wallet.reset();
        // Redirect to home
        this._$location.path('/')
    }

    /**
     * changeLanguage() Change app language
     *
     * @param key: language key
     */
    changeLanguage(key) {
        this._$translate.use(key.toString());
        this._storage.lang = key.toString();
    };

    /**
     * changeNode() Change node and store it in local storage
     *
     * @param node: node uri
     */
    changeNode(node) {
        if (!node) {
            this._Alert.noNodeSet();
            return;
        }

        //Check and format url from user input
        let properNode = helpers.checkAndFormatUrl(node, this._AppConstants.defaultWebsocketPort.toString());
        if(!properNode) {
            this._Alert.invalidCustomNode();
            return;
        } else if(properNode === 1) {
            this._Alert.invalidWebsocketPort();
            return;
        }

        // Disconnect and connect to node
        this.reconnect(properNode);

        //Reset node values
        this.currentNode = properNode;
        this.customNode = undefined;

        // Set new node in Wallet service
        this._Wallet.node = properNode;

        // Set node in local storage according to network
        if (this._Wallet.network == Network.data.Mainnet.id) {
            this._storage.selectedMainnetNode = properNode;
        } else if (this._Wallet.network == Network.data.Testnet.id) {
            this._storage.selectedTestnetNode = properNode;
        } else {
            this._storage.selectedMijinNode = properNode;
        }
    }

    /**
     * reconnect() Disconnect and connect to specified node
     *
     * @param node: node uri
     */
    reconnect(node) {
        // Close connector
        this._DataBridge.connector.close();
        this._DataBridge.connectionStatus = false;
        // Reset data in DataBridge service
        this._DataBridge.reset();
        // Connect
        let connector = this._Connector.create({
            'uri': node
        }, this._Wallet.currentAccount.address);
        this._DataBridge.openConnection(connector);
    }

    getGcchcBalance() {

        this.updateCurrentAccountMosaics();

        if (this.customMosaicExist()) {
            let customMosaic = this.getCustomMosaic()
            if (undefined !== customMosaic) {
                return this._$filter('fmtSupply')(customMosaic.quantity, customMosaic.mosaicId, this._DataBridge.mosaicDefinitionMetaDataPair)[0]
                + '.'
                + this._$filter('fmtSupply')(customMosaic.quantity, customMosaic.mosaicId, this._DataBridge.mosaicDefinitionMetaDataPair)[1]
            }
        }

        return '0.000000';

    }

    /**
     * Get current account mosaics names
     */
    updateCurrentAccountMosaics() {

        if (undefined === this._Wallet.currentAccount) {
            return;
        }

        // Get current account
        let acct = this._Wallet.currentAccount.address;

        // Set current account mosaics names if mosaicOwned is not undefined
        if (undefined !== this._DataBridge.mosaicOwned[acct]) {
            this.currentAccountMosaicNames = Object.keys(this._DataBridge.mosaicOwned[acct]).sort();
        } else {
            this.currentAccountMosaicNames = ["nem:xem"];
        }

    }

    /**
     * Checks to see if the wallet contains custom configured mosaic.
     */
    customMosaicExist() {

        let mosaicsFound = this.currentAccountMosaicNames.filter((mosaicName) => {
            return mosaicName == this._AppConstants.customMosaic;
        });

        return mosaicsFound.length > 0

    }

    getCustomMosaic() {

        if (undefined === this._Wallet.currentAccount) {
            return undefined;
        }

        // Get current account
        let acct = this._Wallet.currentAccount.address;
        return this._DataBridge.mosaicOwned[acct][this._AppConstants.customMosaic];

    }

}

let AppHeader = {
    controller: AppHeaderCtrl,
    templateUrl: 'layout/header.html'
};

export default AppHeader;
