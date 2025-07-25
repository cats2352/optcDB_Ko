(function() {

var notes = {
    captainProportional: "The exact multiplier used to compute the damage is proportional to the " +
        "crew's remaining HP and is higher the #1 the HP is. The multiplier is calculated as #2. " +
        "At full health the boost is equal to #3x, with 1 HP left to #4x.",
    captainFixed:"The multiplier is #1 unless #2, in which case it is #3.",
    fixed: "Fixed damage means it entirely bypasses the enemy's defense.",
    gOrbs: "Characters with [G] orbs will deal 1.5x their normal damage. [G] orbs are affected by orb boosters.",
	noFixedPerc: "Specials that deal fixed damage or cut a percentage of the enemy's HP are not " +
        "affected by this captain ability",
    orb: "Orb amplification only affects matching and opposite orbs and works both ways: " +
        "matching orbs will deal #1 more damage and opposite orbs will deal #1 less damage.",
    poison: "Poison deals #1 character's ATK in fixed damage that bypasses defensive buffs at the end of each turn.",
    toxic: "Toxic starts at #1 character's attack and increases by #2 at the end of every turn until #3 damage per turn.",
    random: "Estimated random damage range: between #1 HP and #2 HP #3.",
    randomHeal: "Estimated random recovery range: between #1 HP and #2 HP.",
    randomHits: "The target of each of the #1 hits is chosen randomly.",
    specialProportional: "The exact multiplier used to compute the damage is proportional to the " +
        "crew's remaining HP and is higher the #1 the HP is. The multiplier is calculated as: #2.",
    stages: "The special can be used as soon as the first stage is reached.",
    specialBind: "Prevent you from activating Special Abilities.",
    rewind: "Some enemies can increase your cooldown by 1/2 turns, this Sailor Ability decreases that by #1 turn(s).",
    ignoreBarrier: "Damage that ignores damage negating abilities and barriers is similar to 6* Law's special, but only for this character.",
    zombie: "The protection only works when attacked by one single enemy and will leave the team with at least 1 HP; " +
        "the effect will not work when attacked by multiples enemies at once.",
    colorAffinity: "'Color Affinity' boosts color type advantages. For example, a STR unit normally deals 2x to a DEX unit and .5x to QCK. With this Color Affinity boost, it will deal (2*#1)x to DEX and (0.5/#1)x to QCK.",
    instantKill: "The chance for this character to instantly kill any enemy is #1. The kills can not be reset by exiting the game, but can change by passing the turn or killing an enemy on that stage.",
    additionalDamage: "Every attacking character gains additional damage if they land a hit no less than Good. Is affected by Conditional ATK boost and Affinity ATK boost",
    beneficial: "\"Beneficial\" orbs grant the same ATK boost as matching orbs and activate any Captain Abilities that are enabled by matching orbs.",
    enrage: "Enrage is activated when your crew took damage from your enemies or map effects in the previous turn or if you reduced your own HP in the previous turn",
};

/***********
 * Angular *
 ***********/

var app = angular.module('optc');
var directives = { }, filters = { };

/************************
 * Attribute directives *
 ************************/

directives.toInt = function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function(value) { return '' + value; });
            ngModel.$formatters.push(function(value) { return parseInt(value, 10); });
        }
    };
};

/**********************
 * Element directives *
 **********************/

directives.linkButton = function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: '../common/views/links.html',
        scope: { exclude: '@' },
        link: function(scope, element, attrs) {
            element.find(".trigger").click(function() {
                element.toggleClass("active"); 
            });
        }
    };
};

/***********
 * Filters * 
 ***********/

filters.decorate = function() {
    return function(input) {
      if (!input) return 'None';
      if (input.constructor == Array) input = input[0];
      if (input.constructor != String) return 'N/A';
  
      const orbMap = { STR: '힘 속성', DEX: '기 속성', QCK: '속 속성', PSY: '심 속성', INT: '지 속성' };
  
      return input
        .replace(/\[?(STR|DEX|QCK|PSY|INT)\]?/g, (_, type) => `<span class="badge ${type}">${orbMap[type]}</span>`)
        .replace(/\[RCV\]/g,'<span class="badge RCV">고기</span>')
        .replace(/\[TND\]/g,'<span class="badge TND"><i class="tnd-icon"></i>연</span>')
        .replace(/\[EMPTY\]/g,'<span class="badge EMPTY"><i class="fa fa-circle-o"></i>공백</span>')
        .replace(/\[BLOCK\]/g,'<span class="badge BLOCK"><i class="block-icon"></i>방해</span>')
        .replace(/\[SUPERBLOCK\]/g,'<span class="badge SUPERBLOCK"><i class="block-icon"></i>슈퍼방해</span>')
        .replace(/\[BOMB\]/g,'<span class="badge BOMB"><i class="fa fa-bomb"></i>폭탄</span>')
        .replace(/\[SUPERBOMB\]/g,'<span class="badge SUPERBOMB"><i class="fa fa-bomb"></i>슈퍼폭탄</span>')
        .replace(/\[PARALYSIS\]/g,'<span class="badge PARALYSIS">마비</span>')
        .replace(/\[RAINBOW\]/g,'<span class="badge RAINBOW">무지개</span>')
        .replace(/\[SEMLA\]/g,'<span class="badge SEMLA">셈라</span>')
        .replace(/\[WANO\]/g,'<span class="badge WANO">와노</span>')
        .replace(/\[G\]/g,'<span class="badge G">G</span>');
    };
  };

filters.range = function() {
    return function(input, total) {
        total = parseInt(total,10);
        for (var i=0;i<total;++i) input.push(i);
        return input;
    };
};

filters.notes = function() {
    return function(input) {
        if (!input) return input;
        return input.trim().replace(/#\{(.+?)\}/g,function(x,y) {
            var tokens = y.trim().split(/:/);
            if (!tokens.length || !notes.hasOwnProperty(tokens[0].trim())) return x;
            return notes[tokens[0].trim()].replace(/#(\d+)/g,function(a,b) {
                return (tokens[parseInt(b,10)] || '').trim();
            });
        });
    };
};

/******************
 * Initialization *
 ******************/

for (var directive in directives)
    app.directive(directive, directives[directive]);

for (var filter in filters)
    app.filter(filter, filters[filter]);

})();
