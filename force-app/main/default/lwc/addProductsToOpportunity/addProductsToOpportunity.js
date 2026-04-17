import { LightningElement, wire, api, track } from 'lwc';
import getProducts from '@salesforce/apex/ProductSelectionController.getProducts';
import createOpportunityProducts from '@salesforce/apex/ProductSelectionController.createOpportunityProducts';
import { getObjectInfo, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { CurrentPageReference } from 'lightning/navigation';
import PRODUCT_OBJECT from '@salesforce/schema/Product2';
import { CloseActionScreenEvent } from 'lightning/actions';
import search from '@salesforce/resourceUrl/search';
import ref from '@salesforce/resourceUrl/ref';

export default class ProductSelectionController extends LightningElement {

    @api recordId;

    @track products = [];
    @track currentStep = 'select';
    @track showProductScreen = true;
    @track typeOptions = [];
    @track allProducts = [];
    @track filteredProducts = [];

    productNameFilter = '';
    categoryFilter = '';
    subcategoryFilter = '';
    productTypeFilter = '';

    @track categoryOptions = [];
    @track subcategoryOptions = [];
    @track selectedProducts = [];
    @track showFilters = true;

    allSubcategoryOptions = [];

    isStyled = false;

    columns = [
        { label: 'Serial Number', fieldName: 'serialNumber', type: 'number' },
        { label: 'Product Name', fieldName: 'Name' },
        { label: 'Product Code', fieldName: 'ProductCode' },
        { label: 'Product Description', fieldName: 'Description' },
        { label: 'HSN Code', fieldName: 'HSN' },
        { label: 'Price', fieldName: 'UnitPrice', type: 'currency' }
    ];

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId
                         || currentPageReference.attributes.recordId
                         || currentPageReference.state.c__recordId;

            if (this.recordId) {
                this.handleLoadProducts();
            }
        }
    }

    handleLoadProducts() {
        getProducts({ opportunityId: this.recordId })
            .then(result => {
                const parsedData = JSON.parse(result);
                this.allProducts = parsedData.map((item, index) => ({
                    Id: item.pbeId,
                    serialNumber: index + 1,
                    Name: item.productName,
                    productId: item.productId,
                    productUrl: '/' + item.productId,
                    ProductCode: item.productCode,
                    Remarks: item.remarks,
                    Description: item.productDescription,
                    HSN: item.HSNCode,
                    UnitPrice: item.unitPrice,
                    Category: item.category,
                    Type: item.productType,
                    Subcategory: item.subcategory,
                    isSelected: false
                }));
                this.filteredProducts = [...this.allProducts];
                this.products = [...this.filteredProducts];
            })
            .catch(error => {
                console.error('Error fetching products:', error);
            });
    }

    @wire(getObjectInfo, { objectApiName: PRODUCT_OBJECT })
    productInfo;

    @wire(getPicklistValuesByRecordType, {
        objectApiName: PRODUCT_OBJECT,
        recordTypeId: '$productInfo.data.defaultRecordTypeId'
    })
    picklistHandler({ data, error }) {
        if (data) {
            this.categoryOptions = [
                { label: 'None', value: '' },
                ...data.picklistFieldValues.Category__c.values.map(item => ({
                    label: item.label,
                    value: item.value
                }))
            ];

            this.typeOptions = [
                { label: 'None', value: '' },
                ...data.picklistFieldValues.Product_Type__c.values.map(item => ({
                    label: item.label,
                    value: item.value
                }))
            ];

            this.allSubcategoryOptions = [
                { label: 'None', value: '' },
                ...data.picklistFieldValues.Subcategory__c.values.map(item => ({
                    label: item.label,
                    value: item.value
                }))
            ];
            this.subcategoryOptions = [...this.allSubcategoryOptions];
        }
    }

    handleCheckboxChange(event) {
        const productId = event.target.dataset.id;
        const isChecked = event.target.checked;
        this.products = this.products.map(prod => {
            return prod.Id === productId
                ? { ...prod, isSelected: isChecked }
                : prod;
        });
    }

    handleAddMore() {
        const newlySelected = this.products.filter(p => p.isSelected);

        if (newlySelected.length === 0) {
            alert('Select at least one product');
            return;
        }

        const existingIds = new Set(this.selectedProducts.map(p => p.Id));
        const newItems = newlySelected
            .filter(p => !existingIds.has(p.Id))
            .map((p, index) => ({
                ...p,
                Quantity: 1,
                serialNumber: this.selectedProducts.length + index + 1
            }));

        this.selectedProducts = [...this.selectedProducts, ...newItems];

        this.productNameFilter = '';
        this.categoryFilter = '';
        this.subcategoryFilter = '';
        this.productTypeFilter = '';

        this.subcategoryOptions = [...this.allSubcategoryOptions];

        this.products = this.allProducts.map((item, index) => ({
            ...item,
            isSelected: false,
            serialNumber: index + 1
        }));

        this.showFilters = false;
        setTimeout(() => {
            this.showFilters = true;
        }, 0);
    }

    handleSearchClick() {
        this.applyFilters();
    }

    handleNameFilter(event) {
        this.productNameFilter = event.target.value.toLowerCase();
    }

    handleCategoryFilter(event) {
        this.categoryFilter = event.target.value;
        this.subcategoryFilter = '';
        this.applyFilters();
    }

    handleSubcategoryFilter(event) {
        this.subcategoryFilter = event.target.value;
        this.applyFilters();
    }

    handleTypeFilter(event) {
        this.productTypeFilter = event.target.value;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.allProducts];

        if (this.productNameFilter) {
            filtered = filtered.filter(prod =>
                prod.Name.toLowerCase().includes(this.productNameFilter)
            );
        }
        if (this.categoryFilter) {
            filtered = filtered.filter(prod =>
                prod.Category === this.categoryFilter
            );
        }
        if (this.subcategoryFilter) {
            filtered = filtered.filter(prod =>
                prod.Subcategory === this.subcategoryFilter
            );
        }
        if (this.productTypeFilter) {
            filtered = filtered.filter(prod =>
                prod.Type === this.productTypeFilter
            );
        }

        this.products = filtered.map((item, index) => ({
            ...item,
            serialNumber: index + 1
        }));
    }

handleNext() {
    const newlySelected = this.products.filter(p => p.isSelected);

    if (this.selectedProducts.length === 0 && newlySelected.length === 0) {
        alert('Please select at least one product');
        return;
    }

    const existingIds = new Set(this.selectedProducts.map(p => p.Id));
    const newItems = newlySelected
        .filter(p => !existingIds.has(p.Id))
        .map((p, index) => ({
            ...p,
            Quantity: 1,
            serialNumber: this.selectedProducts.length + index + 1
        }));

    this.selectedProducts = [...this.selectedProducts, ...newItems];

    this.productNameFilter = '';
    this.categoryFilter = '';
    this.subcategoryFilter = '';
    this.productTypeFilter = '';
    this.subcategoryOptions = [...this.allSubcategoryOptions];

    this.products = this.allProducts.map((item, index) => ({
        ...item,
        isSelected: false,
        serialNumber: index + 1
    }));

    this.showFilters = false;
    setTimeout(() => {
        this.showFilters = true;
    }, 0);

    this.currentStep = 'confirm';
}

renderedCallback() {
    const modal = this.template.host.closest('.slds-modal__container');
    if (modal) {
        modal.style.maxWidth = '100%';
        modal.style.width = '100%';

        if (this.isConfirmStep) {
            modal.style.height = '50%';
            modal.style.minHeight = '50%';
        } else {
            modal.style.height = '100%';
            modal.style.minHeight = '60%';
        }
    }
}

    handleQuantityChange(event) {
        const productId = event.target.dataset.id;
        const value = event.target.value;
        this.selectedProducts = this.selectedProducts.map(prod =>
            prod.Id === productId ? { ...prod, Quantity: value } : prod
        );
    }

    handleBack() {
        this.currentStep = 'select';
    }

    handlePriceChange(event) {
        const productId = event.target.dataset.id;
        const value = event.target.value;
        this.selectedProducts = this.selectedProducts.map(prod =>
            prod.Id === productId ? { ...prod, UnitPrice: value } : prod
        );
    }

    handleRemarksChange(event) {
        const productId = event.target.dataset.id;
        const value = event.target.value;
        this.selectedProducts = this.selectedProducts.map(prod =>
            prod.Id === productId ? { ...prod, Remarks: value } : prod
        );
    }

    closeProductScreen() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
    
   @track isSaving = false;

handleSave() {
    if (this.isSaving) return; 
    this.isSaving = true;

    const items = this.selectedProducts.map(prod => ({
        opportunityId: this.recordId,
        pbeId: prod.Id,
        quantity: prod.Quantity || 1,
        unitPrice: prod.UnitPrice,
        description: prod.Description,
        remarks: prod.Remarks ?? '',
    }));

    createOpportunityProducts({ productJson: JSON.stringify(items) })
        .then(() => {
            this.dispatchEvent(new CloseActionScreenEvent());
        })
        .catch(error => {
            console.error('Save error:', error);
            this.isSaving = false; 
        });
}

    renderedCallback() {
        const modal = this.template.host.closest('.slds-modal__container');
        if (modal && !this.isStyled) {
            modal.style.maxWidth = '100%';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.minHeight = '60%';
            this.isStyled = true;
        }
    }
    
    handleRefreshClick() {
    this.productNameFilter = '';
    this.categoryFilter = '';
    this.subcategoryFilter = '';
    this.productTypeFilter = '';
    this.subcategoryOptions = [...this.allSubcategoryOptions];

    this.products = this.allProducts.map((item, index) => ({
        ...item,
        isSelected: false,
        serialNumber: index + 1
    }));

    this.showFilters = false;
    setTimeout(() => {
        this.showFilters = true;
    }, 0);
}

    handleDeleteProduct(event) {
    const productId = event.currentTarget.dataset.id;

    this.selectedProducts = this.selectedProducts
        .filter(prod => prod.Id !== productId)
        .map((prod, index) => ({
            ...prod,
            serialNumber: index + 1  
        }));
}

    get isSelectStep() {
        return this.currentStep === 'select';
    }

    get isConfirmStep() {
        return this.currentStep === 'confirm';
    }
    get saveLabel() {
    return this.isSaving ? 'Saving...' : 'Save';
}
}