// Fichier généré par scripts/build-frequentation.py - ne pas modifier à la main.
// Source : Île-de-France Mobilités, validations sur le réseau ferré, 1er trimestre 2026 (métro) ; Aéroport d’Orly : médiane (pas de données).
// Points de rareté par station (identifiant Wikidata) : 10 = très fréquentée, 100 = très peu fréquentée.
export const STATION_POINTS: Record<string, number> = {
  Q1018164: 100, // Buttes Chaumont
  Q1018331: 85, // Buzenval
  Q1019487: 65, // Bérault
  Q1025135: 60, // Cadet
  Q1028368: 65, // Cambronne
  Q1044915: 90, // Carrefour Pleyel
  Q1061527: 35, // Champs-Élysées - Clemenceau
  Q1063134: 60, // Charenton - Écoles
  Q1090315: 95, // Château-Landon
  Q1090753: 40, // Château d'Eau
  Q1090894: 20, // Châtillon - Montrouge
  Q1094294: 85, // Cité
  Q1103432: 25, // Cluny - La Sorbonne
  Q1110656: 45, // Colonel Fabien
  Q1132595: 50, // Corentin Celton
  Q1137613: 25, // Cour Saint-Émilion
  Q1137705: 65, // Couronnes
  Q1140796: 40, // Croix de Chavaux
  Q1142525: 80, // Créteil - L'Échat
  Q1165108: 100, // Danube
  Q1172977: 35, // Daumesnil
  Q1185683: 70, // Front Populaire
  Q1187054: 45, // Denfert-Rochereau
  Q119911: 45, // Ménilmontant
  Q119971: 25, // Porte d'Orléans
  Q120303: 80, // Corentin Cariou
  Q1228836: 70, // Michel-Ange - Molitor
  Q1237945: 65, // Iéna
  Q1263417: 75, // Télégraphe
  Q1266508: 50, // Dupleix
  Q1267446: 50, // Duroc
  Q1267664: 35, // Villejuif - Louis Aragon
  Q1272925: 15, // Trocadéro
  Q1284106: 80, // Edgar Quinet
  Q1315757: 65, // Rue Saint-Maur
  Q1316395: 85, // Trinité - d'Estienne d'Orves
  Q1320288: 25, // La Courneuve - 8 Mai 1945
  Q1341849: 10, // République
  Q1344485: 35, // Plaisance
  Q1344536: 40, // Porte Maillot
  Q1344555: 20, // Pont de Neuilly
  Q1368326: 15, // Esplanade de La Défense
  Q1368640: 85, // Solférino
  Q1392037: 15, // Opéra
  Q1392295: 85, // Saint-François-Xavier
  Q140277: 35, // La Défense
  Q1403165: 15, // Strasbourg - Saint-Denis
  Q1405224: 90, // Maisons-Alfort - Stade
  Q1406323: 95, // Mouton-Duvernet
  Q1412692: 30, // Richelieu - Drouot
  Q1414178: 90, // Filles du Calvaire
  Q1415143: 15, // La Motte-Picquet - Grenelle
  Q1417199: 15, // Madeleine
  Q1418711: 15, // Nation
  Q1418821: 30, // Stalingrad
  Q1438901: 45, // Fort d'Aubervilliers
  Q1445234: 15, // Franklin D. Roosevelt
  Q1450538: 55, // Saint-Ambroise
  Q1451224: 30, // Porte de Saint-Cloud
  Q1458421: 85, // Pont-Neuf
  Q1459231: 45, // Victor Hugo
  Q1459245: 70, // Porte Dauphine
  Q1461794: 60, // Louvre - Rivoli
  Q1463644: 30, // Jussieu
  Q1467113: 15, // Palais Royal - Musée du Louvre
  Q1479476: 85, // Félix Faure
  Q1494172: 10, // Gare de l'Est
  Q1494174: 10, // Gare du Nord
  Q1494179: 15, // Gare d'Austerlitz
  Q1495676: 45, // Ourcq
  Q1501462: 25, // Pyramides
  Q1511318: 20, // Odéon
  Q1511335: 30, // Villiers
  Q1511378: 75, // Javel - André Citroën
  Q1511392: 90, // Ségur
  Q1511406: 30, // Havre - Caumartin
  Q1511414: 95, // Vaneau
  Q1514082: 80, // La Tour-Maubourg
  Q1517347: 55, // Jourdain
  Q1519529: 10, // Saint-Lazare
  Q1528456: 60, // Invalides
  Q1529016: 35, // Glacière
  Q1535005: 25, // Saint-Paul
  Q1536969: 60, // Goncourt
  Q1537246: 10, // Place d'Italie
  Q1537255: 80, // Louis Blanc
  Q1543053: 20, // Grands Boulevards
  Q1547535: 35, // Porte de Vanves
  Q1572249: 45, // Laumière
  Q1576190: 100, // Pelleport
  Q1576198: 100, // Saint-Fargeau
  Q1576609: 45, // Passy
  Q1576642: 25, // Maison Blanche
  Q1576648: 65, // Tolbiac
  Q1576810: 10, // Les Halles
  Q1576928: 20, // Porte de Vincennes
  Q1577103: 30, // La Chapelle
  Q1577219: 50, // Alexandre Dumas
  Q1578030: 30, // Oberkampf
  Q1578045: 25, // Miromesnil
  Q1578058: 85, // Raspail
  Q1578078: 100, // Porte d'Auteuil
  Q1578089: 30, // Sèvres - Babylone
  Q1578103: 35, // Pasteur
  Q1598555: 25, // Saint-Michel
  Q16040484: 80, // Montreuil - Hôpital
  Q16040556: 85, // La Dhuys
  Q16040585: 85, // Serge Gainsbourg
  Q16040626: 95, // Coteaux Beauclair
  Q16040875: 75, // Romainville - Carnot
  Q16041052: 55, // Rosny-Bois-Perrier
  Q16041258: 75, // Villejuif - Gustave Roussy
  Q1612093: 65, // Mairie d'Aubervilliers
  Q1622759: 60, // Marx Dormoy
  Q163879: 60, // Simplon
  Q1651903: 70, // Lourmel
  Q1660212: 95, // Temple
  Q1666283: 80, // Porte de Charenton
  Q1672055: 45, // Porte de Bagnolet
  Q167371: 60, // Porte de Champerret
  Q1673779: 20, // Olympiades
  Q1677923: 70, // Jacques Bonsergent
  Q168170: 50, // La Muette
  Q1683797: 75, // Jasmin
  Q1684455: 60, // Pernety
  Q1717241: 95, // Monceau
  Q1725892: 75, // Liberté
  Q1731762: 85, // Malakoff - Rue Étienne-Dolet
  Q176582: 40, // Père Lachaise
  Q1768692: 40, // Alma - Marceau
  Q1772478: 85, // Riquet
  Q177476: 55, // Place Monge
  Q1783617: 50, // Les Gobelins
  Q1783630: 90, // Porte d'Italie
  Q1783803: 30, // Saint-Denis - Université
  Q1783889: 55, // Sentier
  Q1783894: 60, // Saint-Sulpice
  Q1783899: 30, // Bir-Hakeim
  Q1783997: 60, // Mairie d'Ivry
  Q1784003: 95, // Pierre et Marie Curie
  Q1784008: 70, // Le Peletier
  Q1784015: 90, // Porte d'Ivry
  Q1784141: 40, // Robespierre
  Q1784153: 80, // Malesherbes
  Q1784247: 60, // Saint-Philippe du Roule
  Q1784678: 25, // Saint-Mandé
  Q1785048: 30, // Porte de Pantin
  Q1785287: 55, // Louise Michel
  Q1785459: 90, // Philippe Auguste
  Q1789070: 80, // Richard-Lenoir
  Q1789126: 35, // Voltaire
  Q1789135: 65, // Place des Fêtes
  Q1789145: 80, // Maubert - Mutualité
  Q181669: 55, // Porte de Saint-Ouen
  Q1845408: 35, // Créteil - Préfecture
  Q1866688: 90, // Liège
  Q1885852: 30, // Mairie de Clichy
  Q1885854: 20, // Mairie de Saint-Ouen
  Q1885858: 35, // Mairie d'Issy
  Q1886721: 50, // Malakoff - Plateau de Vanves
  Q1892927: 25, // Marcadet - Poissonniers
  Q1937499: 95, // Saint-Georges
  Q1969289: 25, // Porte de Versailles
  Q1969303: 55, // Pyrénées
  Q1969443: 75, // Sèvres - Lecourbe
  Q1969462: 40, // Pont de Levallois - Bécon
  Q1969472: 75, // Rue des Boulets
  Q1969480: 20, // Porte de Clignancourt
  Q1969501: 95, // Quai de la Rapée
  Q1969659: 75, // Quai de la Gare
  Q1969677: 95, // Rennes
  Q1969873: 40, // Saint-Denis - Porte de Paris
  Q1969904: 35, // Pont de Sèvres
  Q1969938: 70, // Ranelagh
  Q1969959: 15, // Porte de Clichy
  Q1970325: 70, // Notre-Dame-des-Champs
  Q1970334: 65, // Parmentier
  Q1999538: 85, // Saint-Jacques
  Q21294263: 55, // Aéroport d'Orly
  Q2270685: 25, // Mairie de Montrouge
  Q238902: 75, // Volontaires
  Q254308: 95, // Kléber
  Q25478742: 50, // Hôpital Bicêtre
  Q25478746: 55, // L'Haÿ-les-Roses
  Q25478754: 45, // Chevilly-Larue
  Q257465: 85, // Sully - Morland
  Q273476: 40, // École Militaire
  Q273645: 55, // École vétérinaire de Maisons-Alfort
  Q274526: 45, // Église de Pantin
  Q274534: 100, // Église d'Auteuil
  Q282600: 90, // Pont Marie
  Q2879106: 60, // Bagneux - Lucie Aubrac
  Q289916: 65, // Étienne Marcel
  Q2979015: 20, // Saint-Ouen
  Q306256: 80, // Abbesses
  Q337855: 60, // Faidherbe - Chaligny
  Q338898: 25, // Pigalle
  Q3396323: 20, // Pont Cardinet
  Q3462074: 70, // Saint-Denis Pleyel
  Q3501980: 70, // Barbara
  Q377782: 60, // Gaîté
  Q382659: 60, // Porte de la Chapelle
  Q426440: 45, // Boulogne - Jean Jaurès
  Q450976: 30, // Alésia
  Q476557: 65, // Villejuif - Léo Lagrange
  Q487505: 50, // Anatole France
  Q50724143: 95, // Thiais - Orly
  Q508256: 10, // Bastille
  Q517739: 90, // Mirabeau
  Q517844: 90, // Avron
  Q524191: 90, // Chemin Vert
  Q550042: 90, // Saint-Sébastien - Froissart
  Q567806: 70, // Rome
  Q568013: 95, // Falguière
  Q568195: 25, // Jaurès
  Q571159: 15, // Bibliothèque François-Mitterrand
  Q571446: 55, // Porte de la Villette
  Q575604: 65, // Notre-Dame-de-Lorette
  Q585712: 40, // Hoche
  Q585752: 40, // Château de Vincennes
  Q586851: 75, // Garibaldi
  Q587093: 70, // Saint-Marcel
  Q589686: 90, // Picpus
  Q592367: 50, // Créteil - Université
  Q593257: 20, // Bobigny - Pablo Picasso
  Q601484: 10, // Châtelet
  Q602615: 75, // Dugommier
  Q606164: 40, // Porte des Lilas
  Q607342: 85, // Cardinal Lemoine
  Q608305: 55, // Commerce
  Q610012: 15, // Place de Clichy
  Q612971: 35, // Anvers
  Q613123: 30, // Marcel Sembat
  Q614049: 15, // Gare de Lyon
  Q614636: 95, // Varenne
  Q616619: 85, // Michel Bizot
  Q617430: 50, // Jules Joffrin
  Q630642: 30, // Convention
  Q631846: 65, // Maraîchers
  Q632881: 40, // Charles Michels
  Q635744: 65, // Ternes
  Q645400: 60, // Argentine
  Q645691: 35, // Gabriel Péri
  Q646376: 65, // Rambuteau
  Q646583: 70, // Courcelles
  Q647271: 20, // Reuilly - Diderot
  Q649160: 25, // Les Sablons
  Q649273: 75, // Saint-Augustin
  Q661846: 70, // Nationale
  Q666009: 80, // Tuileries
  Q668351: 20, // Mairie de Montreuil
  Q669850: 25, // Réaumur - Sébastopol
  Q670081: 70, // Pereire
  Q680787: 45, // Ledru-Rollin
  Q683208: 95, // Campo-Formio
  Q683544: 55, // Mairie des Lilas
  Q690975: 25, // George V
  Q713944: 40, // Arts et Métiers
  Q733618: 45, // Les Courtilles
  Q738879: 40, // Guy Môquet
  Q740744: 95, // Assemblée nationale
  Q746288: 35, // Crimée
  Q751245: 100, // Pré-Saint-Gervais
  Q758464: 30, // Aubervilliers - Pantin - Quatre Chemins
  Q761518: 65, // Billancourt
  Q763411: 40, // Saint-Placide
  Q764106: 50, // Poissonnière
  Q764465: 10, // Montparnasse - Bienvenüe
  Q766186: 90, // Aimé Césaire
  Q766618: 90, // Europe
  Q766906: 80, // Maisons-Alfort - Les Juilliottes
  Q769848: 55, // Vaugirard
  Q771548: 50, // Rue de la Pompe
  Q777553: 70, // Bréguet - Sabin
  Q780625: 70, // La Fourche
  Q781873: 40, // Saint-Germain-des-Prés
  Q790593: 90, // Avenue Émile Zola
  Q800624: 15, // Charles de Gaulle - Étoile
  Q804647: 30, // Balard
  Q807893: 20, // Barbès - Rochechouart
  Q810151: 35, // Basilique de Saint-Denis
  Q815061: 75, // Bel-Air
  Q815946: 15, // Belleville
  Q818853: 20, // Bercy
  Q881406: 45, // Blanche
  Q888758: 55, // Bobigny - Pantin - Raymond Queneau
  Q891105: 80, // Boissière
  Q891362: 100, // Bolivar
  Q892720: 35, // Bonne Nouvelle
  Q894930: 100, // Botzaris
  Q894984: 50, // Boucicaut
  Q895108: 50, // Boulogne - Pont de Saint-Cloud
  Q895259: 55, // Bourse
  Q915581: 40, // Gallieni
  Q923435: 85, // Brochant
  Q927829: 95, // Chardon-Lagache
  Q930284: 60, // Le Kremlin-Bicêtre
  Q935233: 45, // Pointe du Lac
  Q937680: 50, // Chevaleret
  Q938430: 50, // Censier - Daubenton
  Q944564: 80, // Wagram
  Q945229: 85, // Quatre-Septembre
  Q946441: 75, // Porte Dorée
  Q946826: 25, // Gambetta
  Q948012: 45, // Charonne
  Q950314: 75, // Corvisart
  Q951466: 20, // Chaussée d'Antin - La Fayette
  Q953454: 45, // Porte de Choisy
  Q954301: 65, // Vavin
  Q954566: 75, // Rue du Bac
  Q957172: 15, // Château Rouge
  Q961089: 80, // Villejuif - Paul Vaillant-Couturier
  Q962861: 65, // Les Agnettes
  Q968336: 50, // Porte de Montreuil
  Q968939: 15, // Hôtel de Ville
  Q970075: 20, // Concorde
  Q970844: 80, // Exelmans
  Q974510: 90, // Mabillon
  Q980380: 70, // Lamarck - Caulaincourt
  Q995228: 80, // Michel-Ange - Auteuil
  Q999159: 95, // Montgallet
};
