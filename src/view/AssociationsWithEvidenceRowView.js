'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

import SpeciesLabel from './SpeciesLabel';

class AssociationsWithEvidenceRowView extends Component {

    constructor() {
        super();
        this.state = {
            expanded: false,
            duration: 500,
        };
        this.renderTerm = this.renderTerm.bind(this);
    }

    renderTerm(go_node) {
        if (go_node.negated === true) {
            var styles = {
                color: 'gray',
            };
            return <del style={styles}><span>{go_node.about.label}</span></del>;
        }
        else {
            return go_node.about.label;
        }
    }

    renderEvidenceTypeLink(evidence) {
        return (
            <a title={evidence.label} href={`http://www.evidenceontology.org/term/${evidence.id}`}>
                {evidence.type}
            </a>
        )
    }

    generatedReferenceWithLink(publicationReference) {
        if (publicationReference.startsWith('PMID:')) {
            return (
                <a href={`https://www.ncbi.nlm.nih.gov/pubmed/${publicationReference.split(':')[1]}`}>
                    {publicationReference}
                </a>
            )
        }
        else
        if (publicationReference.startsWith('WB_REF:')) {
            return (
                <a href={`https://www.wormbase.org/resources/paper/${publicationReference.split(':')[1]}`}>
                    {publicationReference}
                </a>
            )
        }
        else
        if (publicationReference.startsWith('ZFIN:')) {
            return (
                <a href={`https://zfin.org/${publicationReference}`}>
                    {publicationReference}
                </a>
            )
        }
        else
        if (publicationReference.startsWith('RGD:')) {
            return (
                <a href={`https://rgd.mcw.edu/rgdweb/report/reference/main.html?id=${publicationReference.split(':')[1]}`}>
                    {publicationReference}
                </a>
            )
        }
        else
        if (publicationReference.startsWith('FB:')) {
            return (
                <a href={`http://flybase.org/reports/${publicationReference.split(':')[1]}`}>
                    {publicationReference}
                </a>
            )
        }
        else
        if (publicationReference.startsWith('SGD_REF:')) {
            return (
                <a href={`https://www.yeastgenome.org/reference/${publicationReference.split(':')[1]}`}>
                    {publicationReference}
                </a>
            )
        }

        console.log('not sure how to handle '+publicationReference);
        return (
            <div style={{color:'gray'}}>
                {publicationReference}
            </div>
        );
    }

    generatedEvidenceWithLink(evidenceWith) {

        // if Gene types
        if (evidenceWith.match(/^(RGD:|ZFIN:ZDB-GENE|WB:|MGI:|SGD:|GO:|HGNC:).*/)) {
            return (
                <a href={`http://www.alliancegenome.org/gene/${evidenceWith}`}>
                    {evidenceWith}
                </a>
            )
        }


        if (evidenceWith.match(/^(GO:).*/)) {
            return (
                <a href={`http://amigo.geneontology.org/amigo/term/${evidenceWith}`}>
                    {evidenceWith}
                </a>
            )
        }

        // if other prefixes but not gene type
        if (evidenceWith.startsWith('ZFIN:')) {
            return (
                <a href={`https://zfin.org/${evidenceWith}`}>
                    {evidenceWith}
                </a>
            )
        }
        if (evidenceWith.startsWith('UniProt')) {
            return (
                <a href={`https://www.uniprot.org/uniprot/${evidenceWith}`}>
                    {evidenceWith}
                </a>
            )
        }
        // TODO: should go to UniProt
        if (evidenceWith.startsWith('PANTHER')) {
            return (
                <a
                    // href={`http://pantherdb.org/treeViewer/treeViewer.jsp?book=${evidenceWith}&species=agr&seq=WormBase=WBGene00006818`}
                    href={`http://pantherdb.org/panther/lookupId.jsp?id=${evidenceWith.split(':')[1]}`}
                >
                    {evidenceWith}
                    {this.props.key}
                </a>
            )
        }

        else {
            return (
                <a href={`https://google.com/?q=${evidenceWith}`}>
                    {evidenceWith}
                </a>
            )
        }
    }

    render() {
        let taxon_result = this.props.taxon_node.children[0];
        // console.log('taxon result')
        // console.log(taxon_result)
        return (
            <div>
                <div className='ontology-ribbon-assoc__row'>
                    <div className="ontology-ribbon-assoc__gene2 ontology-ribbon-evidence-header">
                    </div>
                    <div className="ontology-ribbon-assoc__evidence-type ontology-ribbon-evidence-header">
                        Evidence
                    </div>
                    <div className="ontology-ribbon-assoc__evidence-with ontology-ribbon-evidence-header">
                        With
                    </div>
                    <div className="ontology-ribbon-assoc__evidence-reference ontology-ribbon-evidence-header">
                        Reference
                    </div>
                </div>
                {
                    taxon_result.children.map((go_node) => {
                        return (
                            <div className='ontology-ribbon-assoc__row' key={go_node.about.id}
                                 style={{backgroundColor: this.props.taxon_node.color}}>
                                <div className='ontology-ribbon-assoc__gene2-content'>
                                    <a
                                        title={go_node.about.label}
                                        href={`http://amigo.geneontology.org/amigo/term/${go_node.about.id}`}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        {this.renderTerm(go_node)}
                                    </a>
                                </div>

                                <div className="ontology-ribbon-assoc__evidence-type">
                                    {this.renderEvidenceTypeLink(go_node.evidence)}
                                </div>
                                <div
                                    className="ontology-ribbon-assoc__evidence-with">
                                    {go_node.evidence.with &&
                                    go_node.evidence.with.map((e, index) => {
                                        return (
                                            <div key={index}>
                                                {this.generatedEvidenceWithLink(e)}
                                            </div>
                                        )
                                    })
                                    }
                                </div>
                                <div
                                    className="ontology-ribbon-assoc__evidence-reference">
                                    {/*{go_node.reference}*/}
                                    {go_node.reference &&
                                    go_node.reference.map((e, index) => {
                                        return (
                                            <div key={index}>
                                                {this.generatedReferenceWithLink(e)}
                                            </div>
                                        )
                                    })
                                    }
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        );

    }

}

AssociationsWithEvidenceRowView.propTypes = {
    taxon_node: PropTypes.object.isRequired,
    geneUrlFormatter: PropTypes.func,
    key: PropTypes.any,
};

export default AssociationsWithEvidenceRowView;