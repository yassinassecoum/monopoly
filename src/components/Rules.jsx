import Modal from './Modal.jsx';

export default function Rules({ onClose }) {
  return (
    <Modal onClose={onClose} label="Règles" wide>
      <div className="rules">
        <h2 className="modal-title">Comment jouer</h2>
        <p>
          Chaque joueur commence avec la même somme. À votre tour, lancez les deux dés et avancez votre pion.
          Le dernier joueur qui n’a pas fait faillite gagne.
        </p>
        <h3>Acheter et encaisser</h3>
        <p>
          Sur une rue, une gare ou une compagnie libre, vous pouvez l’acheter. Si vous refusez, elle part aux enchères
          (si l’option est active). Quand un adversaire s’arrête chez vous, il vous paie un loyer. Posséder tout un quartier
          double le loyer des terrains nus.
        </p>
        <h3>Construire</h3>
        <p>
          Avec un quartier complet et sans hypothèque, construisez des maisons de façon uniforme : pas de deuxième maison
          sur un terrain tant que les autres n’en ont pas une. Après 4 maisons vient l’hôtel. Les constructions se revendent
          à moitié prix. Ouvrez la fiche d’un terrain (clic sur la case ou sur la pastille dans votre panneau) pour gérer.
        </p>
        <h3>Gares et compagnies</h3>
        <p>
          Une gare rapporte 25 €, puis 50, 100 et 200 € selon le nombre de gares possédées. Une compagnie rapporte 4 fois
          le total des dés, ou 10 fois si vous possédez les deux.
        </p>
        <h3>Doubles et prison</h3>
        <p>
          Un double vous fait rejouer. Trois doubles d’affilée vous envoient en prison. En prison, vous pouvez payer 50 €,
          utiliser une carte « Libéré de prison » ou tenter un double pendant 3 tours ; au 3ᵉ échec, vous payez 50 € et
          avancez. En prison, vous continuez à toucher vos loyers.
        </p>
        <h3>Hypothèques et dettes</h3>
        <p>
          Hypothéquer un terrain rapporte la moitié de son prix, mais il ne produit plus de loyer. Lever l’hypothèque coûte
          ce montant plus 10 %. Si vous devez plus que ce que vous avez, vendez des maisons ou hypothéquez jusqu’à pouvoir
          payer ; sinon, déclarez faillite : vos biens vont à votre créancier.
        </p>
        <h3>Échanges</h3>
        <p>
          À votre tour, proposez un échange de terrains, d’argent ou de cartes prison. Un terrain dont le quartier a des
          constructions ne peut pas être échangé. Les joueurs ordinateur acceptent seulement les offres qui les avantagent.
        </p>
        <h3>Raccourcis</h3>
        <p>Espace lance les dés ou termine le tour. Échap ferme les fenêtres. La partie est sauvegardée automatiquement.</p>
      </div>
    </Modal>
  );
}
