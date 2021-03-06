import taxa from './data/taxa';

const queryRGB = [0, 96, 96];
const orthoRGB = [86, 148, 27];
const queryColor = "#dfebeb"; //"#c0d8d8";
const orthoColor = "#f3f9f0"; //"#d8eecd";


Object.defineProperty(Array.prototype, 'unique', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function () {
        let a = this.concat();
        for (let i = 0; i < a.length; ++i) {
            for (let j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j] || a[j] === undefined)
                    a.splice(j--, 1);
            }
        }
        a = a.filter(x => x != null);

        return a;
    }
});

function isNegate(assoc) {
    return (assoc.qualifier && assoc.qualifier.length === 1 && assoc.qualifier[0] === 'not');
}

function getKeyForObject(assoc) {
    return isNegate(assoc) ? 'neg::' + assoc.object.id : assoc.object.id;
}


export function unpackSlimItems(results, subject, slimlist) {
    let title = subject;
    let queryResponse = [];
    let others = [];
    let allGOids = [];
    let globalGOids = [];
    results.forEach(function (result) {
        if (result.data.length > 0) {
            // merge these assocs into the overall response to this query
            Array.prototype.push.apply(queryResponse, result.data);
        }
    });
    /*
    bulk of the annotations initialized first
    */
    // each ID has to be mapped across slims in order to merge them
    let assocMap = {};

    const blocks = slimlist.map(function (slimitem) {
        if (slimitem.golabel.includes('other')) {
            others.push(slimitem);
        }
        let assocs = [];
        queryResponse.forEach(function (response) {
            if (response.slim === slimitem.goid) {
                // skip noninformative annotations like protein binding
                for (let i = response.assocs.length - 1; i >= 0; i--) {
                    let assoc = response.assocs[i];
                    if (assoc.object.id === 'GO:0005515' ||
                        assoc.object.id === 'GO:0003674' ||
                        assoc.object.id === 'GO:0008150' ||
                        assoc.object.id === 'GO:0005575') {
                        response.assocs.splice(i, 1);
                    }
                }
                for (let assoc of response.assocs) {
                    let tempAssoc = {};
                    let key = getKeyForObject(assoc);
                    if (!assocMap[key]) {
                        tempAssoc = assoc;
                        tempAssoc.evidence_type = [assoc.evidence_type];
                        tempAssoc.evidence = [assoc.evidence];
                    }
                    else {
                        tempAssoc = assocMap[key];
                        tempAssoc.evidence_with = [...assoc.evidence_with, ...tempAssoc.evidence_with].unique();
                        tempAssoc.evidence = [...assoc.evidence, ...tempAssoc.evidence].unique();
                        tempAssoc.qualifier = [...assoc.qualifier, ...tempAssoc.qualifier].unique();
                        tempAssoc.evidence_type = [...assoc.evidence_type, ...tempAssoc.evidence_type].unique();
                        tempAssoc.reference = [...assoc.reference, ...tempAssoc.reference].unique();
                        tempAssoc.publications = [...assoc.publications, ...tempAssoc.publications].unique();
                    }
                    assocMap[key] = tempAssoc;
                }


                // these are all the assocs under this slim class
                // we don't want the association map, just those for this slim
                Array.prototype.push.apply(assocs, response.assocs.filter((f) => {
                    let key = getKeyForObject(f);
                    if (globalGOids.indexOf(key) < 0) {
                        globalGOids.push(key);
                        return true
                    }
                    else {
                        return false;
                    }
                }));
                /*
                keep track of which associations are found for slim classes
                so that (after this loop) these can be removed from "other"'s list
                */
                if (!slimitem.golabel.includes('other')) {
                    assocs.forEach(function (assoc) {
                        let key = getKeyForObject(assoc);
                        allGOids.push(key);
                    })
                }
            }
        });

        // set up uniques and color too
        let block_color = orthoRGB;
        slimitem.uniqueAssocs = [];
        if (assocs.length > 0) {
            let hits = [];
            slimitem.uniqueAssocs = assocs.filter(function (assocItem) {
                /*
                  First a hack to accommodate swapping out HGNC ids for UniProtKB ids
                */
                if (subject.startsWith('HGNC') && assocItem.subject.taxon.id === 'NCBITaxon:9606') {
                    assocItem.subject.id = subject; // Clobber the UniProtKB id
                }
                /*
                  Then another interim hack because of differences in resource naming
                  e.g. FlyBase === FB
                */
                let subjectID = assocItem.subject.id.replace('FlyBase', 'FB');
                assocItem.subject.id = subjectID;
                if (subjectID === subject) {
                    title = assocItem.subject.label + ' (' + assocItem.subject.id + ')';
                    block_color = queryRGB;
                }

                let label = assocItem.subject.id + ': ' + assocItem.object.label + ' ' + assocItem.negated;
                if (!hits.includes(label)) {
                    hits.push(label);
                    return true;
                } else {
                    return false;
                }
            });
            slimitem.uniqueAssocs.sort(sortAssociations);
            slimitem.uniqueAssocs = subjectFirst(subject, slimitem.uniqueAssocs);
            slimitem.color = heatColor(slimitem.uniqueAssocs.length, block_color, 48);
            slimitem.tree = buildAssocTree(slimitem.uniqueAssocs, subject);
        } else {
            slimitem.color = "#fff";
            slimitem.tree = undefined;
        }
        return slimitem;
    });
    others.forEach(function (otherItem) {
        for (let i = otherItem.uniqueAssocs.length - 1; i >= 0; i--) {
            let checkAssoc = otherItem.uniqueAssocs[i];
            if (allGOids.indexOf(checkAssoc.object.id) >= 0) {
                otherItem.uniqueAssocs.splice(i, 1);
            }
        }
        /*
          Need to update the color
        */
        if (otherItem.uniqueAssocs.length > 0) {
            let block_color = orthoRGB;
            let taxon_color = orthoColor;
            otherItem.uniqueAssocs.forEach(function (otherAssoc) {
                if (otherAssoc.subject.id === subject) {
                    block_color = queryRGB;
                    taxon_color = queryColor;
                }
            });
            otherItem.uniqueAssocs.sort(sortAssociations);
            otherItem.uniqueAssocs = subjectFirst(subject, otherItem.uniqueAssocs);
            otherItem.color = heatColor(otherItem.uniqueAssocs.length, block_color, 48);
            otherItem.tree = buildAssocTree(otherItem.uniqueAssocs, subject);
        } else {
            otherItem.color = "#fff";
            otherItem.tree = undefined;
        }
    });
    return {
        title: title,
        data: blocks
    };
}

function sortAssociations(assoc_a, assoc_b) {
    let taxa_ids = Array.from(taxa.keys());
    let index_a = taxa_ids.indexOf(assoc_a.subject.taxon.id);
    let index_b = taxa_ids.indexOf(assoc_b.subject.taxon.id);
    if (index_a < index_b) {
        return -1;
    }
    if (index_a > index_b) {
        return 1;
    }
    if (assoc_a.subject.id < assoc_b.subject.id) {
        return -1;
    }
    if (assoc_a.subject.id > assoc_b.subject.id) {
        return 1;
    }
    if (assoc_a.object.label < assoc_b.object.label) {
        return -1;
    }
    if (assoc_a.object.label > assoc_b.object.label) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

function subjectFirst(subject, uniqueAssocs) {
    let subjectAssocs = [];
    for (let i = uniqueAssocs.length - 1; i >= 0; i--) {
        let assoc = uniqueAssocs[i];
        if (assoc.subject.id === subject) {
            // remove this from current list
            uniqueAssocs.splice(i, 1);
            // add it to the top of the revised list
            subjectAssocs.splice(0, 0, assoc);
        }
    }
    // now collect the remaining associations to orthologs
    return subjectAssocs.concat(uniqueAssocs);
}

export function heatColor(associations_count, rgb, heatLevels) {
    if (associations_count === 0)
        return "#fff";
    let blockColor = [];     // [r,g,b]
    for (let i = 0; i < 3; i++) {
        // logarithmic heatmap (with cutoff)
        if (associations_count < heatLevels) {
            // instead of just (256-rgb[i])/(Math.pow(2,associations_count)),
            // which divides space from 'white' (255) down to target color level in halves,
            // this starts at 3/4
            const heatCoef = 3 * (256 - rgb[i]) / (Math.pow(2, associations_count + 1));
            blockColor[i] = Math.round(rgb[i] + heatCoef);
        }
        else {
            blockColor[i] = rgb[i];
        }
    }
    return 'rgb(' + blockColor[0] + ',' + blockColor[1] + ',' + blockColor[2] + ')';
}

function containsPMID(references) {
    for (let r of references) {
        if (r.startsWith('PMID:')) return true;
    }
    return false;
}

/**
 *
 * @param references
 * @returns {*}
 */
function filterDuplicationReferences(references) {


    // if references contains a PMID, remove the non-PMID ones
    if (!containsPMID(references)) {
        return references;
    }
    else {
        let returnArray = [];
        for (let r of references) {
            if (r.startsWith('PMID:')) {
                returnArray.push(r);
            }
        }
        return returnArray;
    }

}

function generateNode(assoc) {
    return {
        about: assoc.object,
        negated: assoc.negated,
        evidence: {
            id: assoc.evidence,
            type: assoc.evidence_type,
            label: assoc.evidence_label,
            with: assoc.evidence_with,
            qualifier: assoc.qualifier,
        },
        publications: assoc.publications,
        reference: filterDuplicationReferences(assoc.reference),
    };
}

export function buildAssocTree(assocs, subject) {
    let prev_species = '';
    let prev_gene = '';
    let current_taxon_node;
    let current_gene_node;
    let assocTree = [];

    assocs.forEach(function (assoc) {
        let taxon_color = assoc.subject.id === subject ?
            queryColor : orthoColor;
        if (assoc.subject.taxon.id !== prev_species) {
            current_taxon_node = {
                color: taxon_color,
                about: assoc.subject.taxon,
                children: []
            };
            assocTree.push(current_taxon_node);

            current_gene_node = {
                about: assoc.subject,
                children: []
            };
            current_taxon_node.children.push(current_gene_node);


            let go_node = generateNode(assoc);

            current_gene_node.children.push(go_node);

            prev_species = assoc.subject.taxon.id;
            prev_gene = assoc.subject.id;

        } else if (assoc.subject.id !== prev_gene) {

            // TODO: should we remove this because we are no longer handling orthology?


            current_gene_node = {
                about: assoc.subject,
                children: []
            };
            current_taxon_node.children.push(current_gene_node);


            let go_node = generateNode(assoc);

            current_gene_node.children.push(go_node);

            prev_gene = assoc.subject.id;

        } else {
            let go_node = generateNode(assoc);

            current_gene_node.children.push(go_node);
        }
    });
    return assocTree;
}
