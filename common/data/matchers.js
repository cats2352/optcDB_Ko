(function () {
	/**
	 * These are the `filters.custom` in "characters\js\table.js", used to "match"
	 * ability descriptions in "common\data\details.js"
	 *
	 * # Properties:
	 * * `name` {string} - Description of the filter that will appear in the sidebar
	 *      in the Character Table
	 * * `target` {string} - The property of an object in `window.details` (see
	 *      "common\data\details.js") that will be matched against `matcher`.
	 * * `matcher` {RegExp} - Regex that will be used to match against `target`. For
	 *      performance and readability purposes, use non-capturing regex groups if
	 *      that group is not matched by any submatcher. It also makes counting
	 *      groups easier (firefox only started supporting named capture groups in
	 *      2020). Do not use lookbehind regexes as they are not supported by Safari
	 *      on iOS, as of 2022. Do learn what the differences of "greedy" and "lazy"
	 *      quantifiers are.
	 * * `submatchers` [{object[]}] - optional array of submatchers. These are used
	 *      for matching the captured groups by the regex for further filtering of
	 *      units. For example, you can filter a unit by its special, specifying its
	 *      multiplier and the number of turns.
	 *
	 * ## Submatcher properties:
	 * * `type` {string} - type of the submatcher. Can be one of the following:
	 * * * "number" - a numerical value that can be compared with "<", ">", "<=",
	 *          ">=", and "=". May be floating-point (so allow that in the regexes where
	 *          there are decimal values). Can also be "completely" or "99+", in which case it
	 *          will be interpreted as Infinity for comparing (make sure that it is in a
	 *          captured group too). This shows up in the sidebar as a label with an
	 *          input text field. Make sure the captured group does not include spaces.
	 *          "?"'s in the captured groups will be replaced by "0" for comparison,
	 *          so that they will be filtered when the filter is on, but won't be
	 *          included when the user searches for specific numbers (unless they search
	 *          for "=0" or "<1").
	 * * * "text" - same as "number", but it matches any text (case-insensitive)
	 *          against the specified groups. This actually supports regex, so
	 *          "luffy|yamato" could be used
	 * * * "option" - matches a regex against the specified `groups`. This shows up
	 *          as a toggleable filter. If the submatcher needs to check if an optional
	 *          group was NOT captured, use the regex /^$/ (empty string). Try to
	 *          optimize them by using `^` (start of string) where applicable, and pick
	 *          shorter keywords. For example, if you need to match the phrase "on the
	 *          supported character", you can include that whole phrase as an optional
	 *          group, but your submatcher regex will just be /./ (any character), so it
	 *          will only check for only one character. If you want a set of options to
	 *          be mutually exclusive (up to only one of them can be active), specify a
	 *          `radioGroup` that they will share.
	 * * * "separator" - a submatcher that doesn't do anything except show some text
	 * * `description` - a string that indicates what the text field of a number-type
	 *      submatcher is for (appears on the left of it) or the text that will show
	 *      up on an option-type submatcher.
	 * * `regex` - a RegExp object used by "option"-type submatchers to check
	 *      against the specified group.
	 * * `radioGroup` - any string that will be used to identify a group of options,
	 *      so that enabling one will turn off all other options that share the same
	 *      `radioGroup`.
	 * * `groups` - an array of indexes (numbers) of the captured group(s) that will
	 *      be matched by the submatcher `regex` or the number the user entered. For
	 *      abilities that may remove an effect's duration completely or by x turns,
	 *      it may be necessary to specify two group indexes, one for the finite "x"
	 *      turns, another for the completely (because we don't say
	 *      "by completely turns"). Note that captured groups have 1-based indexes,
	 *      because the 0th group is the whole string captured by the whole regex.
	 * * `cssClasses` - optional array of strings of css class names to apply to the
	 *      submatcher div. If not provided, they will be given the 'min-width-12'
	 *      class (because the parent div is a flexbox, allowing options to be
	 *      placed beside each other to save space). If provided, the given array
	 *      will be used and will not be given the default class (unless it is also
	 *      in the given array)
	 *
	 * Matchers and submatchers are evaluated in CharUtils.checkMatcher in
	 * "characters\js\utils.js". Also see `directives.addTags` in "characters\js\directives.js".
	 *
	 * # Regex Notes:
	 * * You can test your regexes at https://regex101.com/, especially with
	 *      complex ones
	 * * Many target properties are JSON stringified as they can be objects, like
	 *      when a support character has multiple sailor abilities. As such, the
	 *      string will be evaluated against a string that may contain quotes.
	 *      To prevent a regex from matching across two separate sailor abilities,
	 *      make sure to exclude quotes when matching any character (i.e. [^"]+
	 *      instead of .+)
	 * * Also exclude dots so that the regex doesn't match across sentences, so use
	 *      [^."]+
	 * * The regexes assume that the words "공격력", "HP", and "RCV" will appear in
	 *      in this order. The only forms expected are the following:
	 *      ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV
	 * * JS does not support atomic groups nor possessive quantifiers (.++) but it
	 *      has a workaround.
	 *      Atomic group - `(?>...)`
	 *      Workaround - `(?=(...))\1`  (http://www.rexegg.com/regex-tricks.html#pseudo-atomic-groups)
	 *      The reason some filters (mainly atk, hp, and rcv boosts) need this is
	 *      that this prevents A LOT of backtracking when a certain part of a
	 *      pattern isn't matched. You can make a regex that will match successfully,
	 *      but the simple ones will take a lot of steps to "fail" because of
	 *      backtracking.
	 *      For example (simplified), `Boosts ATK of ([^."]*?)characters by (\d+)x for (\d+) turn`
	 *      There are a few units that boost statically, like #613's "Boosts ATK and
	 *      RCV of all characters by 45 for 1 turn, amplifies the effect of orbs of
	 *      all characters by 2x for 1 turn" (try making a multiplicative ATK boost
	 *      filter that doesn't match this), which will
	 *      fail when the regex encounters the `x` in the multiplier part of the
	 *      regex, so it backtracks to the `[^."]*?` part, which will give back
	 *      every character it captured AND recheck, just to try if the regex will still match,
	 *      so this results in a lot of backtracking (like hundreds or even thousands
	 *      of extra steps).
	 *      This also results in them trying to match for another "by x" in the
	 *      string, so it could give a false positive when there is a different buff
	 *      in the string.
	 *      Give http://www.rexegg.com/regex-quantifiers.html#explicit_greed a read
	 *      (regex experience required)
	 *      The resulting regexes may seem more complicated, but it's a lot more
	 *      efficient and will prevent the regex from "jumping over the fence".
	 *      The key to seeing the performance difference here is to check how few
	 *      steps it requires to match and to fail (as in not trying further).
	 *
	 * # Common Patterns
	 * * by ([?.\d]+)x(?:-([?.\d]+)x)?
	 * * * should match "by ?x", "by 2.5-3.5x", "by 2.?x"
	 * * for ([?\d]+\+?)(?:-([?\d]+))? turns?
	 * * * should match "for ? turns", "for 2-3 turns", "for 99+ turns"
	 * * by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?
	 * * * doubled multiplier regex, allowing for an optional "otherwise" clause
	 * * for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?
	 * * * double turns regex
	 * * by ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?
	 * * * this simply combines the first two, and doubles it for an optional "otherwise" clause
	 * * * should match "by 2x-3x for 1-2 turns, by 1.5-2.5x for 1-2 turns instead"
	 * * (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))
	 * * * mostly for status effect reducers, should accept "by 1-3 turns" or "completely"
	 * * * (interpreted as Infinity for comparison). This does not accept "by 99+ turns" since "completely" is used for them
	 * * of (?=((?:(?=([^c."]+))\2|c(?!har))*))\1characters?
	 * * of (?=((?:[^c."]+|c(?!har))*))\1characters?
	 * * * explicit greedy alternation, with a workaround for atomic groups. either is usable
	 * * * the first one is what is in the guide, the second one is my simplified version (no need for the first atomic group)
	 * * * this is basically /of ([^."]*?)characters?/, but prevents backtracking when the next parts of the pattern are not met, potentially leading to false positives.
	 * * * for example, "boosts base atk of all characters by 1000, boosts atk of all characters by 1.5x"
	 * * * this could be matched if the regex for the base atk uses /by ([?.\d]+)x/
	 */
	
	// 해당 코드는 매핑 코드입니다.

	const orbKoMap = {
	STR: "힘",
	DEX: "기",
	QCK: "속",
	PSY: "심",
	INT: "지",
	G: "G",
	RCV: "고기",
	TND: "연",
	BOMB: "폭탄",
	EMPTY: "공백",
	SUPERBOMB: "슈퍼 폭탄",
	RAINBOW: "무지개",
	SEMLA: "셈라",
	WANO: "和"
};

	var typeKoMap = {
	STR: "힘",
	DEX: "기",
	QCK: "속",
	PSY: "심",
	INT: "지"
	};

	var classKoMap = {
	Fighter: "격투",
	Shooter: "사격",
	Slasher: "참격",
	Striker: "타격",
	"Free Spirit": "자유",
	Cerebral: "박식",
	Powerhouse: "강인",
	Driven: "야심"
	};
// 추가된건 여기까지
	var types = ["STR", "DEX", "QCK", "PSY", "INT"];
	var classes = [
		"Fighter",
		"Shooter",
		"Slasher",
		"Striker",
		"Free Spirit",
		"Cerebral",
		"Powerhouse",
		"Driven",
	];

	function createTypesSubmatchers(
		groups,
		includeUniversal = true,
		universalRegex = "all|type"
	) {
		var result = [];
		for (var [i, type] of types.entries()) {
			result.push({
				type: "option",
				description: typeKoMap[type], //여기도 변경함 사유 매핑작업
				// interpret "Captain's Type", "Dominant Type", "each Type" as universal (only when filtering for types)
				regex: new RegExp(
					"\\[" + type + "\\]" + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: [i < 3 ? "min-width-4" : "min-width-6"],
				groups: groups,
			});
		}
		return result;
	}

	function createClassesSubmatchers(
		groups,
		includeUniversal = true,
		universalRegex = "모두"
	) {
		var result = [];
		for (var [i, class_] of classes.entries()) {
			result.push({
				type: "option",
				description: classKoMap[class_], // 여기 코드 변경함 사유: 매핑작업
				regex: new RegExp(
					class_ + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
		}
		return result;
	}

	function createOrbsSubmatchers(
		orbs,
		groups,
		includeUniversal = true,
		universalRegex = "all"
	) {
		var result = [];

		for (var [i, orb] of orbs.entries()) {
			var minWidth = 6;
			if (orb.length <= 3) minWidth = "2";
			else if (orb.length <= 5) minWidth = "3";
			result.push({
				type: "option",
				description: orbKoMap[orb] || orb, //매핑작업
				regex: new RegExp(
					"\\[" + orb + "\\]" + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-" + minWidth],
				groups: groups,
			});
		}
		return result;
	}

	function createPositionsSubmatchers(
		groups,
		includeUniversal = true,
		universalRegex = "모두",
		excludedSubmatchers = [],
		useRowsAndColumns = true
	) {
		const rows = ["Top", "Middle", "Bottom"];
		const columns = ["Left", "Right"];
		const rowKoMap = { //매핑소스추가 시작점
			Top: "상단",
			Middle: "중단",
			Bottom: "하단"
		};

		const colKoMap = {
			Left: "좌측",
			Right: "우측"
		}; //매핑소스추가 끝점
		var result = [];
		if (useRowsAndColumns) {
			for (var [i, row] of rows.entries()) {
				if (!excludedSubmatchers.includes(row)) {
					result.push({
						type: "option",
						description: rowKoMap[row], //매핑작업으로 인한 교체
						regex: new RegExp(
							row + (includeUniversal ? "|" + universalRegex : ""),
							"i"
						),
						cssClasses: ["min-width-4"],
						groups: groups,
					});
				}
			}
			for (var [i, col] of columns.entries()) {
				if (!excludedSubmatchers.includes(col)) {
					result.push({
						type: "option",
						description: colKoMap[col], //매핑작업으로 인한 교체
						regex: new RegExp(
							col + (includeUniversal ? "|" + universalRegex : ""),
							"i"
						),
						cssClasses: ["min-width-6"],
						groups: groups,
					});
				}
			}
		} else {
			// for the rows, this should catch "top and bottom rows" and the like
			// by simply excluding "top right" from Friend Captain (top left),
			// we can match "top row", "top left", "top and bottom rows", and "top" (like "top characters", in case the "row" is forgotten)
			// of course, there is no "left and right columns", since that's just "all characters"
			result.push({
				type: "option",
				description: "친구 선장",
				regex: new RegExp(
					"left column|top(?! right)|Friend Captain" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
			result.push({
				type: "option",
				description: "선장",
				regex: new RegExp(
					"right column|top(?! left)|(?:^|(?!end ).{4})Captain" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				), // should catch "the Captain", but not "Friend Captain"
				cssClasses: ["min-width-6"],
				groups: groups,
			});
			result.push({
				type: "option",
				description: "중단 좌측",
				regex: new RegExp(
					"left column|middle(?! right)" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
			result.push({
				type: "option",
				description: "중단 우측",
				regex: new RegExp(
					"right column|middle(?! left)" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
			result.push({
				type: "option",
				description: "하단 좌측",
				regex: new RegExp(
					"left column|bottom(?! right)" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
			result.push({
				type: "option",
				description: "하단 우측",
				regex: new RegExp(
					"right column|bottom(?! left)" +
						(includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-6"],
				groups: groups,
			});
		}

		if (!excludedSubmatchers.includes("Adjacent")) {
			result.push({
				type: "option",
				description: "인접",
				regex: new RegExp(
					"adjacent" + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-4"],
				groups: groups,
			});
		}
		if (!excludedSubmatchers.includes("Selected")) {
			result.push({
				type: "option",
				description: "선택",
				regex: new RegExp(
					"selected" + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-4"],
				groups: groups,
			});
		}
		if (!excludedSubmatchers.includes("Self")) {
			result.push({
				type: "option",
				description: "자신",
				regex: new RegExp(
					"this|own|supported" + (includeUniversal ? "|" + universalRegex : ""),
					"i"
				),
				cssClasses: ["min-width-4"],
				groups: groups,
			});
		}
		return result;
	}

	function createUniversalSubmatcher(groups, universalRegex = "all|type") {
		var result = [];
		result.push({
			type: "option",
			description: "모든 속성",
			// interpret "Captain's Type", "Dominant Type", "each Type" as universal
			regex: new RegExp(universalRegex || "all|type", "i"),
			groups: groups,
		});
		return result;
	}

	/**
	 * Convenience function to construct a RegExp object from an array of regexes,
	 * allowing us to split a regex across lines and even add comments. Note that
	 * you can't split a regex group as each subregex must be a valid regex object.
	 * Credit: https://stackoverflow.com/a/30835667
	 *
	 * @param {RegExp[]} regs
	 * @param {string} options - RegExp options (flags) for the resulting object
	 * @returns {RegExp}
	 */
	function multilineRegExp(regs, options) {
		return new RegExp(
			regs
				.map(function (reg) {
					return reg.source;
				})
				.join(""),
			options
		);
	}

	// Structure will be changed to window.matchers[target][matcherGroup]
	let matchers = {
		데미지: [
			{
				name: "old 데미지딜러",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /deals.+to/i,
			},

			{
				name: "old 즉시 데미지 딜러",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/deals[^"]+?to \w+ enem(?:y|ies)(?=((?: with the highest current HP)?))\1(?! at the (?:end|start))/i,
			},

			{
				name: "데미지 딜러: 즉뎀",
				targets: ["special", "superSpecial", "swap", "support"],
				// for the ones with numbers and an "x" like "50x character's ATK", the "x" is not made optional, and instead the static values will be captured in different groups, so the submatchers can distinguish them.
				// "무 속성" and the like should come BEFORE "고정 데미지"
				// since this matches "the enemy with the highest current HP" (and possibly others in the future),
				// that group is placed in an atomic group. Otherwise, the negative lookahead for the
				// "at the (?:end|start)" will not work due to backtracking.

				// match "Deals 50x character's ATK in Typeless Fixed True damage, ignoring Normal Attack Only, to all enemies"
				// match "Deals 1,000,000 Fixed True damage, ignoring Normal Attack Only, to all enemies"
				// match "Deals random [STR] damage to one enemy"
				// match "Deals 10 hits of random [INT] damage to random enemies"
				// match "deals 5x the damage received in the previous turn in [INT] damage to all enemies"
				// match "Deals 25x character's ATK to one enemy" should be interpreted as typeless damage
				// match "Deals 25x character's ATK in Typeless damage to one enemy"
				// match "Deals 30x the damage taken from enemies before the special is activated in Typeless damage to all enemies"
				// match "Deals 20x the damage taken from enemies in the previous turn in Typeless damage to all enemies"
				// match "Deals 0.5x the damage dealt in the previous turn in Typeless damage to all enemies"
				// match "deals 3x the damage dealt by this character with normal attacks in Typeless damage to the enemy with the highest current HP"
				// match "Deals random large [INT] Damage to all enemies..."
				// match "Deals 2x the damage dealt in Overkill Damage in the previous turn in Typeless damage to all enemies"
				// match "Deals 10x Excess Healing done before the special is activated in Typeless damage to all enemies"
				// match "Deals 20%-40% of enemies' current HP in damage to all enemies"
				// Health-Sacrificial Damage Dealer
				// // match "deals 15x the amount of HP subtracted in Typeless damage to all enemies"
				regex:
					/Deals (?:([?\d]+) hits? of )?(random(?: large)?|([?.\d]+)x(?:-([?.\d]+)x)? (character's ATK|the amount of HP subtracted|the damage taken from enemies (?:before the special is activated|in the previous turn)|the damage dealt (?:in (?:Overkill Damage in )?the previous turn|by this character with normal attacks)|Excess Healing done before the special is activated)|([?.\d]+)%(?:-([?.\d]+)%)? of enemies' current HP|([?,\d]+)(?:-([?,\d]+))?) (?:in )?((?:typeless|\[\w+\]|character's type) )?(Fixed )?(True )?damage(, ignoring Normal Attack Only,?|, depending on the crew's current HP,?)? to (all enemies|random enemies|one enemy|the enemy)(?=((?: with the highest current HP)?))\15(?! at the (?:end|start))/i,
				submatchers: [
					{
						type: "number",
						description: "# 히트 수 (다중 히트):", // this matches only multi-hit, so "1 hit" specials won't be matched
						groups: [1],
					},
					{
						type: "option",
						description: "랜덤 데미지",
						regex: /^random/i,
						groups: [2],
					},
					{
						type: "number",
						description: "고정 값:",
						groups: [8, 9],
					},
					{
						type: "number",
						description: "HP 비율 감소",
						groups: [6, 7],
					},
					{
						type: "number",
						description: "배율",
						groups: [3, 4],
					},
					{
						type: "separator",
						description: "배율 적용 기준:",
					},
					{
						type: "option",
						description: "캐릭터 공격력",
						regex: /^character's ATK/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "총 데미지",
						regex: /^the damage dealt/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "초과 회복량",
						regex: /^Excess Healing/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "받은 데미지만큼",
						regex: /^the damage taken from enemies/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "체력 소모량",
						regex: /^the amount of HP subtracted/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "체력 기반",
						regex: /^, depending on the crew's current HP/i,
						radioGroup: "basis",
						groups: [13],
					},
					{
						type: "separator",
						description: "데미지 유형:",
					},
					{
						type: "option",
						description: "속성",
						regex: /^[^t]/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "무 속성",
						regex: /^$|typeless/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "고정 데미지",
						regex: /./,
						groups: [11],
					},
					{
						type: "option",
						description: "실제",
						regex: /./,
						groups: [12],
					},
					{
						type: "option",
						description: "일반공격 외 데미지1 무시",
						regex: /^, ignoring Normal Attack Only/,
						groups: [13],
					},
					{
						type: "separator",
						description: "대상:",
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^one|^the/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^all|^each/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "랜덤 적",
						regex: /^random/,
						radioGroup: "targets",
						groups: [14],
					},
				],
			},

			{
				name: "Old End of Turn Damage Dealer",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /(deals|cuts)[^."]+end of (?:the|each) turn/i,
			},

			{
				name: "데미지 딜러: 턴 종료시",
				targets: ["captain"],
				regex:
					/Deals (?:([?\d]+) hits? of )?(random(?: large)?|([?.\d]+)x(?:-([?.\d]+)x)? (character's ATK|the amount of HP subtracted|the damage taken from enemies (?:before the special is activated|in the previous turn)|the damage dealt (?:in (?:Overkill Damage in )?the previous turn|by this character with normal attacks)|Excess Healing done before the special is activated)|([?.\d]+)%(?:-([?.\d]+)%)? of enemies' current HP|([?,\d]+)(?:-([?,\d]+))?) (?:in )?((?:typeless|\[\w+\]|character's type) )?(Fixed )?(True )?damage(, ignoring Normal Attack Only,?)? to (all enemies|random enemies|one enemy|the enemy)(?=((?: with the highest current HP)?))\15 at the end of (?:the|each|every) (?:turn|stage)/i,
				submatchers: [
					{
						type: "number",
						description: "# 히트 수 (다중 히트):", // this matches only multi-hit, so "1 hit" specials won't be matched
						groups: [1],
					},
					{
						type: "option",
						description: "랜덤 데미지",
						regex: /^random/i,
						groups: [2],
					},
					{
						type: "number",
						description: "고정 값:",
						groups: [8, 9],
					},
					{
						type: "number",
						description: "HP 비율 감소",
						groups: [6, 7],
					},
					{
						type: "number",
						description: "배율",
						groups: [3, 4],
					},
					{
						type: "separator",
						description: "배율 적용 기준:",
					},
					{
						type: "option",
						description: "캐릭터 공격력",
						regex: /^character's ATK/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "총 데미지",
						regex: /^the damage dealt/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "초과 회복량",
						regex: /^Excess Healing/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "받은 데미지만큼",
						regex: /^the damage taken from enemies/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "체력 소모량",
						regex: /^the amount of HP subtracted/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "separator",
						description: "데미지 유형:",
					},
					{
						type: "option",
						description: "속성",
						regex: /^[^t]/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "무 속성",
						regex: /^$|typeless/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "고정 데미지",
						regex: /./,
						groups: [11],
					},
					{
						type: "option",
						description: "실제",
						regex: /./,
						groups: [12],
					},
					{
						type: "option",
						description: "일반공격 외 데미지1 무시",
						regex: /./,
						groups: [13],
					},
					{
						type: "separator",
						description: "대상:",
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^one|^the/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^all|^each/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "랜덤 적",
						regex: /^random/,
						radioGroup: "targets",
						groups: [14],
					},
				],
			},

			{
				name: "Old1 End of Turn Damage Dealer",
				targets: ["special", "superSpecial", "swap", "support"],
				// match "deals 0.5x the damage dealt by this character with normal attacks to all enemies at the end of each turn for 99+ turns"
				// should not match "Deals [PSY] damage to one enemy according to HP, recovers 5x character's RCV in HP at the end of each turn for 5 turns"
				regex:
					/(?:deals|cuts)(?=((?:[^er."]+|e(?!nd of)|\.\d|r(?!ecover))*))\1end of (?:the|each) turn for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "데미지 딜러: 턴 종료시",
				targets: ["special", "superSpecial", "swap", "support"],
				// match "deals 0.5x the damage dealt by this character with normal attacks to all enemies at the end of each turn for 99+ turns"
				// should not match "Deals [PSY] damage to one enemy according to HP, recovers 5x character's RCV in HP at the end of each turn for 5 turns"
				regex:
					/Deals (?:([?\d]+) hits? of )?(random(?: large)?|([?.\d]+)x(?:-([?.\d]+)x)? (character's ATK|the amount of HP subtracted|the damage taken from enemies (?:before the special is activated|in the previous turn)|the damage dealt (?:in (?:Overkill Damage in )?the previous turn|by this character with normal attacks)|Excess Healing done before the special is activated)|([?.\d]+)%(?:-([?.\d]+)%)? of enemies' current HP|([?,\d]+)(?:-([?,\d]+))?) (?:in )?((?:typeless|\[\w+\]|character's type) )?(Fixed )?(True )?damage(, ignoring Normal Attack Only,?)? to (all enemies|random enemies|one enemy|the enemy)(?=((?: with the highest current HP)?))\15 at the end of (?:the|each|every) (?:turn|stage)(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [16, 17, 18, 19],
					},
					{
						type: "number",
						description: "# 히트 수 (다중 히트):", // this matches only multi-hit, so "1 hit" specials won't be matched
						groups: [1],
					},
					{
						type: "option",
						description: "랜덤 데미지",
						regex: /^random/i,
						groups: [2],
					},
					{
						type: "number",
						description: "고정 값:",
						groups: [8, 9],
					},
					{
						type: "number",
						description: "HP 비율 감소",
						groups: [6, 7],
					},
					{
						type: "number",
						description: "배율",
						groups: [3, 4],
					},
					{
						type: "separator",
						description: "배율 적용 기준:",
					},
					{
						type: "option",
						description: "캐릭터 공격력",
						regex: /^character's ATK/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "총 데미지",
						regex: /^the damage dealt/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "초과 회복량",
						regex: /^Excess Healing/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "받은 데미지만큼",
						regex: /^the damage taken from enemies/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "체력 소모량",
						regex: /^the amount of HP subtracted/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "separator",
						description: "데미지 유형:",
					},
					{
						type: "option",
						description: "속성",
						regex: /^[^t]/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "무 속성",
						regex: /^$|typeless/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "고정 데미지",
						regex: /./,
						groups: [11],
					},
					{
						type: "option",
						description: "실제",
						regex: /./,
						groups: [12],
					},
					{
						type: "option",
						description: "일반공격 외 데미지1 무시",
						regex: /./,
						groups: [13],
					},
					{
						type: "separator",
						description: "대상:",
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^one|^the/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^all|^each/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "랜덤 적",
						regex: /^random/,
						radioGroup: "targets",
						groups: [14],
					},
				],
			},

			{
				name: "데미지 딜러: 배틀 시작시",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// match "deals 0.5x the damage dealt by this character with normal attacks to all enemies at the end of each turn for 99+ turns"
				// should not match "Deals [PSY] damage to one enemy according to HP, recovers 5x character's RCV in HP at the end of each turn for 5 turns"
				regex:
					/Deals (?:([?\d]+) hits? of )?(random(?: large)?|([?.\d]+)x(?:-([?.\d]+)x)? (character's ATK|the amount of HP subtracted|the damage taken from enemies (?:before the special is activated|in the previous turn)|the damage dealt (?:in (?:Overkill Damage in )?the previous turn|by this character with normal attacks)|Excess Healing done before the special is activated)|([?.\d]+)%(?:-([?.\d]+)%)? of enemies' current HP|([?,\d]+)(?:-([?,\d]+))?) (?:in )?((?:typeless|\[\w+\]|character's type) )?(Fixed )?(True )?damage(, ignoring Normal Attack Only,?)? to (all enemies|random enemies|one enemy|the enemy)(?=((?: with the highest current HP)?))\15 at the start of (?:the|each|every) (?:turn|stage)(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [16, 17, 18, 19],
					},
					{
						type: "number",
						description: "# 히트 수 (다중 히트):", // this matches only multi-hit, so "1 hit" specials won't be matched
						groups: [1],
					},
					{
						type: "option",
						description: "랜덤 데미지",
						regex: /^random/i,
						groups: [2],
					},
					{
						type: "number",
						description: "고정 값:",
						groups: [8, 9],
					},
					{
						type: "number",
						description: "HP 비율 감소",
						groups: [6, 7],
					},
					{
						type: "number",
						description: "배율",
						groups: [3, 4],
					},
					{
						type: "separator",
						description: "배율 적용 기준:",
					},
					{
						type: "option",
						description: "캐릭터 공격력",
						regex: /^character's ATK/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "총 데미지",
						regex: /^the damage dealt/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "초과 회복량",
						regex: /^Excess Healing/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "받은 데미지만큼",
						regex: /^the damage taken from enemies/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "option",
						description: "체력 소모량",
						regex: /^the amount of HP subtracted/i,
						radioGroup: "basis",
						groups: [5],
					},
					{
						type: "separator",
						description: "데미지 유형:",
					},
					{
						type: "option",
						description: "속성",
						regex: /^[^t]/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "무 속성",
						regex: /^$|typeless/i,
						radioGroup: "1",
						groups: [10],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "고정 데미지",
						regex: /./,
						groups: [11],
					},
					{
						type: "option",
						description: "실제",
						regex: /./,
						groups: [12],
					},
					{
						type: "option",
						description: "일반공격 외 데미지1 무시",
						regex: /./,
						groups: [13],
					},
					{
						type: "separator",
						description: "대상:",
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^one|^the/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^all|^each/,
						radioGroup: "targets",
						groups: [14],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "랜덤 적",
						regex: /^random/,
						radioGroup: "targets",
						groups: [14],
					},
				],
			},

			{
				name: "old 체력 비례데미지 딜러",
				targets: ["special"],
				regex: /specialProportional/i,
			},
		],
		"데미지 및 능력치 강화": [
			{
				name: "old상시 공격력 상승 (%t타겟%)",
				targets: ["captain", "sailor"],
				regex: /Boosts (base )?(?:their )?ATK/i,
			},

			{
				name: "상시 공격력 상승",
				targets: ["captain"],
				// Can be "boosts ATK of all characters by 1x-2x, by ?x-3x otherwise"
				// Or "boosts HP of Striker characters by 2.5x, their ATK by 2x" (or RCV first)
				// Or "Boosts ATK of Slasher characters by 3.25x, by 4.0625x instead if they have a [DEX] or [INT] orb" (or beneficial orb)
				// or "boosts ATK of all characters by 1x-2x, depending on the crew's current HP, and their HP by 2x"
				// But NOT "boosts ATK of Striker characters by 2.5x, boosts their HP by 1.2x"
				// "boosts" should NOT be matched within, which should be a different buff already
				// `","` is the JSON separator for array items
				// wrap the part before "공격력" in an atomic group to prevent backtracking
				// prevent it from jumping over "reduces"
				regex:
					/Boosts (?=((?:[^.abor"]+|a(?!tk)|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes)|"(?!,"))*))\1ATK(?: and HP| and RCV|, HP and RCV)?(?: of ([^."]*?)characters?)? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "상시 기본 공격력 상승",
				targets: ["sailor"],
				// separate the "by 1.2x" and "by 1,000" into groups so that they can be matched by different submatchers
				// in the regex alternations, the "multiplier" groups go first, so when it tries to find an "x",
				// it falls back to the "static boost" groups
				regex:
					/Boosts base ATK(?: and HP| and RCV|, HP and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?))?/i,
				submatchers: [
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "old 지속 기본 공격력 증가",
				targets: ["support"],
				regex: /Adds.+%.+ATK/i,
			},

			{
				name: "상시 기본 공격력 상승",
				targets: ["support"],
				regex: /Adds ([?.\d]+)% of this character's base ATK/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "old 지속 체력 증가",
				targets: ["captain", "sailor"],
				regex: /Boosts (base )?(HP|ATK and HP|ATK, HP)|Boosts.+their HP/i,
			},

			{
				name: "지속 체력 증가",
				targets: ["captain"],
				// Can be "boosts HP of all characters by 1x-2x, by ?x-3x otherwise"
				// Or "boosts ATK of Striker characters by 2.5x, their HP by 1.2x"
				// or "boosts ATK of all characters by 1x-2x, depending on the crew's current HP, and their HP by 2x"
				// But not "boosts ATK of Striker characters by 2.5x, boosts their HP by 1.2x"
				// "boosts" should NOT be matched within, which should be a different buff already
				// Also NOT "Boosts ATK of [STR] characters by 2.5x and reduces their HP by 60%"
				// `","` is the JSON separator for array items. Allow "Special Name"
				regex:
					/Boosts (?=((?:[^.bhor"]+|h(?!p (?:and RCV )?(?:by|of))|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes)|"(?!,"))*))\1HP(?: and RCV)?(?: of ([^."]*?)characters?)? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "지속 기본 체력 상승",
				targets: ["sailor"],
				// separate the "by 1.2x" and "by 100" into groups so that they can be matched by different submatchers
				// in the regex alternations, the "multiplier" groups go first, so when it finds an "x",
				// it falls back to the "static boost" groups
				regex:
					/Boosts base (?:ATK, |ATK and )?HP(?: and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?))?/i,
				submatchers: [
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "old지속 기본 체력 상승",
				targets: ["support"],
				regex: /Adds.+%.+HP/i,
			},

			{
				name: "지속 기본 체력 상승",
				targets: ["support"],
				regex:
					/Adds ([?.\d]+)% of this character's base (?:HP|ATK and HP|ATK, HP)/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "old지속 회복력 상승",
				targets: ["captain", "sailor"],
				regex:
					/Boosts (base )?(RCV|ATK and RCV|HP and RCV|ATK, HP and RCV)|Boosts.+their RCV/i,
			},

			{
				name: "지속 회복력 상승",
				targets: ["captain"],
				// same as ATK and HP
				// should not match "Boosts ATK of all characters by 3x, their HP by 1.25x and recovers 0.5x this character's RCV at the end of the turn"
				regex:
					/Boosts (?=((?:[^.bor"]+|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes|cv[^\]])|"(?!,"))*))\1RCV(?: of ([^."]*?)characters?)? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "지속 기본 회복력 상승",
				targets: ["sailor"],
				// separate the "by 1.2x" and "by 100" into groups so that they can be matched by different submatchers
				// in the regex alternations, the "multiplier" groups go first, so when it finds an "x",
				// it falls back to the "static boost" groups
				regex:
					/Boosts base (?:ATK, HP and |ATK and |HP and )?RCV of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?))?/i,
				submatchers: [
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "old지속 기본 회복력 상승",
				targets: ["support"],
				regex: /Adds.+%.+RCV/i,
			},

			{
				name: "지속 기본 회복력 상승",
				targets: ["support"],
				regex:
					/Adds ([?.\d]+)% of this character's base (?:RCV|ATK and RCV|HP and RCV|ATK, HP and RCV)/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "필살기 데미지 증가",
				targets: ["captain"],
				regex: /Boosts damage.+specials/i,
			},

			{
				name: "old 공격력 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /boosts( own ATK| ATK)(?! against)/i,
			},

			{
				name: "공격력 상승",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				/* Uses explicit greedy alternation for "of ...characters", preventing
                backtracking with every character matched in it (easily reaches a
                thousand extra steps), like if there's an ATK boost that has "by 45",
                but no "x" because it's not a multiplier. It also prevents it from
                jumping over "characters" in the mentioned case, as it would no
                longer be able to backtrack. Variable atk boosts and variable turns
                should be accounted for with optional groups, and should handle an
                "otherwise" clause. This part of the regex also uses a workaround
                for atomic groups in JS.

                "If something, boosts ATK, HP and RCV of [PSY], Cerebral and Free
                Spirit characters by 2x-2.5x for 1-2 turns, by 1.5x-2x for 2-3 turns
                otherwise."
            */
				regex:
					/Boosts ATK(?: and HP| and RCV|, HP and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, ([^,]+),)? (?:after [?\d\w]+? hit in the chain )?for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 9, 10],
					},
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 11, 12],
					},
					{
						type: "number",
						description: "턴:",
						groups: [7, 8, 14, 15],
					},
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "회복력 상승",
				targets: ["special"],
				regex: /Boosts RCV/i,
			},

			{
				name: "old 기본 공격력 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /boosts[^."]*?base ATK/i,
			},

			{
				name: "기본 공격력 상승",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Boosts base ATK(?: and HP| and RCV|, HP and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?)(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 9, 10],
					},
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 11, 12],
					},
					{
						type: "number",
						description: "턴:",
						groups: [7, 8, 14, 15],
					},
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [6, 13],
						cssClasses: ["min-width-6"],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "턴 종료시 기본 공격력 상승",
				targets: ["support"],
				// must match both "by 1.5x" and "by 1,500". Make the two capture groups separate
				// so one can search either by multiplier or by static boost
				regex:
					/Boosts base ATK(?: and HP| and RCV|, HP and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?) until the next stage(?:, by (?:([?.\d]+)x(?:-([?.\d]+)x)?|([?.,\d]+)(?:-([?.,\d]+))?) until the next stage)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 6, 7],
					},
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [4, 5, 8, 9],
					},
				],
			},

			{
				name: "공격력 상승: 일정 콤보 수 달성",
				targets: ["special", "superSpecial"],
				regex: /Boost.+hit in the chain/i,
			},

			{
				name: "Old Orb boosters",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /boosts Orb Effects/i,
			},

			/*         {
            name: 'Orb Effect: Boost',
            targets: [ 'captain' ],
            regex: /boosts Orb Effects of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
            submatchers: [
                {
                    type: 'number',
                    description: 'Multiplier:',
                    groups: [2, 3, 4, 5],
                },
                ...createUniversalSubmatcher([1]),
                {
                    type: 'separator',
                    description: 'Affected types:',
                },
                ...createTypesSubmatchers([1]),
                {
                    type: 'separator',
                    description: 'Affected classes:',
                },
                ...createClassesSubmatchers([1]),
                {
                    type: 'separator',
                    description: 'Affected positions:',
                },
                ...createPositionsSubmatchers([1]),
            ],
        }, */

			{
				name: "슬롯영향 증폭",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/boosts Orb Effects of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 7, 8],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5, 6, 10, 11],
					},
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "슬롯 영향: 슬롯에 의한 배율변경",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				//increases Orb Effects of beneficial [TND] orbs to 2.25x for 1 turn
				regex:
					/increases Orb Effects of (beneficial)? ?((?:(?!increases Orb Effects)[^."])*?) orbs to ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "option",
						description: "유리슬롯만",
						regex: /./i,
						groups: [1],
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"G",
							"RCV",
							"TND",
							"BOMB",
							"EMPTY",
							"SUPERBOMB",
							"RAINBOW",
							"SEMLA",
							"WANO",
						],
						[2],
						false
					),
					{
						type: "number",
						description: "배율",
						groups: [3, 4],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5, 6],
					},
				],
			},

			{
				name: "old 속성 상성 강화",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts (?:the )?Color Affinity/i,
			},

			{
				name: "속성 상성 강화",
				targets: ["captain"],
				regex:
					/Boosts (?:the )?Color Affinity of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "속성 상성 강화",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts (?:the )?Color Affinity of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 7, 8],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5, 6, 10, 11],
					},
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "old 추가 데미지",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Additional.+Damage/i,
			},

			{
				name: "추가 데미지",
				targets: ["captain", "sailor"],
				regex:
					/Adds ([?.\d]+)x(?:-([?.\d]+)x)? character's ATK as Additional (Typeless )?Damage/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2],
					},
				],
			},

			{
				name: "추가 데미지",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Adds ([?.\d]+)x(?:-([?.\d]+)x)? (?:the )?((?:supported )?character's ATK|damage taken from enemies (?:in the previous turn|before the special is activated)) as Additional (Typeless )?Damage (?:to ([^."]+?)attacks )?for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2],
					},
					{
						type: "separator",
						description: "배율 적용 기준:",
					},
					{
						type: "option",
						description: "캐릭터 공격력",
						regex: /character's ATK/i,
						radioGroup: "basis",
						groups: [3],
					},
					{
						type: "option",
						description: "받은 데미지만큼",
						regex: /^damage taken from enemies/i,
						radioGroup: "basis",
						groups: [3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [6, 7],
					},
					...createUniversalSubmatcher([5], "all|type|^$"),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([5]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([5]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([5]),
				],
			},

			{
				name: "상태 이상시공격력 상승",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Boosts ATK.+against.+enemies/i,
			},

			{
				name: "적 타입에 따른 데미지 증가",
				targets: ["sailor"],
				regex: /Boosts this character's damage against/i,
			},

			{
				name: "old 지연 상태시 공격력 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts ATK.+against.+delayed.+enemies/i,
			},

			{
				name: "상태이상시 공격력 증가: 지연상태",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters?' ATK) against[^."]+?delayed enemies[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 지연상태",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?delayed enemies[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "old 방어력 감소상태 대상 공격력 상승",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts ATK.+against.+enemies.+reduced defense/i,
			},

			{
				name: "상태이상시 공격력 증가: 방어력 상승",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies with reduced defense[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 방어력 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?enemies with reduced defense[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "old 방어력 상승중인 적에게 데미지 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts ATK.+against.+enemies.+increased defense/i,
			},

			{
				name: "상태이상시 공격력 증가: 방어력 상승",
				//targets: [ 'captain' ],
				targets: [],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies with increased defense[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 방어력 상승",
				targets: ["special"],
				regex:
					/Boosts ATK against[^."]+?enemies with increased defense[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 5, 6],
					},
					{
						type: "number",
						description: "턴:",
						groups: [3, 4, 7, 8],
					},
				],
			},

			{
				name: "old 독 상태시 공격력 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/Boosts ATK.+against.+?((strongly )?poisoned.+enemies|enemies.+inflicted with ((strong )?poison|Toxic))/i,
			},

			{
				name: "상태이상시 공격력 증가: 독",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?(?:(?:(?:strongly )?poisoned.+enemies|enemies inflicted with (?:(?:strong )?poison|Toxic)))[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 독",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?(?:(?:(?:strongly )?poisoned.+enemies|enemies inflicted with (?:(?:strong )?poison|Toxic)))[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "old 화상 상태시 공격력 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts ATK.+against.+enemies.+burn/i,
			},

			{
				name: "상태이상시 공격력 증가: 화상",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies inflicted with burn[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 화상",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?enemies inflicted with burn[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "old 네거티브 상태시 공격력 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts ATK.+against.+enemies.+negative/i,
			},

			{
				name: "상태이상시 공격력 증가: 네거티브",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies inflicted with negative[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 네거티브",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?enemies inflicted with negative[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "상태이상시 공격력 증가: 마비",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?paralyzed enemies[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력 증가: 마비",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?paralyzed enemies[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "상태이상시 공격력증가: 피해 데미지 상승",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies inflicted with Increase Damage Taken[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력증가: 피해 데미지 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?enemies inflicted with Increase Damage Taken[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "상태이상시 공격력증가:  약체상태",
				targets: ["captain"],
				regex:
					/Boosts (?:ATK|([^."]*?)characters? ATK) against[^."]+?enemies inflicted with Weaken[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "상태이상시 공격력증가:  약체상태",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts ATK against[^."]+?enemies inflicted with Weaken[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "상태이상시 공격력증가:  강적",
				targets: ["special", "superSpecial"],
				regex:
				/Boosts ATK against[^."]+?Marked enemies[^."]+?by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 9, 10],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 8],
						cssClasses: ["min-width-6"],
					}
				],
			},

			{
				name: "old 특정 적한테 주는 데미지 증가",
				targets: ["support"],
				regex: /Boosts the supported character's ATK.+against/i,
			},

			{
				name: "특정 적한테 주는 데미지 증가",
				targets: ["support"],
				regex:
					/Boosts the supported character's ATK by ([?.\d]+)x against ([^."]+)/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1],
					},
					{
						type: "text",
						description: "Enemy name:",
						groups: [2],
					},
				],
			},

			{
				name: "old 체인 배율 증가",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Boosts.+chain multiplier/i,
			},

			{
				name: "체인 효과: 배율",
				targets: ["captain"],
				regex:
					/Boosts Chain Multiplier Growth Rate by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "체인 효과: 배율",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts Chain Multiplier Growth Rate by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [3, 7],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [3, 7],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 7],
						cssClasses: ["min-width-6"],
					},
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 5, 6],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 8, 9],
					},
				],
			},

			{
				name: "old 체인계수 증가/가산",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Adds.+to Chain/i,
			},

			{
				name: "체인 효과: 증가",
				targets: ["captain"],
				regex: /adds ([?.\d]+)x(?:-([?.\d]+)x)? to (?:the )?Chain multiplier/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2],
					},
				],
			},

			{
				name: "체인 효과: 증가",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/adds ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? to (?:the )?Chain multiplier for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [3],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [3],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3],
						cssClasses: ["min-width-6"],
					},
					{
						type: "number",
						description: "배율",
						groups: [1, 2],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
				],
			},

			{
				name: "체인 효과: 탭 타이밍",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/increases Chain Tap Timing Bonus of ([^."]+?)characters? to \+([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for (\d) turns? depending on Tap Timing/i,
				submatchers: [
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "적과 아군의 해제효과 무효",
						regex: /preventing buff clears/,
						radioGroup: "targets",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/i,
						radioGroup: "targets",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5],
					},
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "old 체인 고정",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Locks the chain multiplier/i,
			},

			{
				name: "체인 계수: 고정",
				targets: ["captain"],
				regex:
					/Locks the chain multiplier at ([?.\d]+)x(?:-([?.\d]+)x)?(?:, at ([?.\d]+)x(?:-([?.\d]+)x)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "체인 계수: 고정",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Locks the chain multiplier at ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, at ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [3, 7],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [3, 7],
						cssClasses: ["min-width-6"],
					},
					{
						type: "number",
						description: "배율",
						groups: [1, 2, 5, 6],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 8, 9],
					},
				],
			},

			{
				name: "old 체인계수 초기/상한수치 고정",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Sets chain boundaries/i,
			},

			{
				name: "체인계수: 초기/상한수치 고정",
				targets: ["captain"],
				regex: /Sets chain boundaries to ([?.\d]+)x and ([?.\d]+)x/i,
				submatchers: [
					{
						type: "number",
						description: "Lower Bound:",
						groups: [1],
					},
					{
						type: "number",
						description: "Upper Bound:",
						groups: [2],
					},
				],
			},

			{
				name: "체인계수: 초기/상한수치 고정",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Sets chain boundaries to ([?.\d]+)x(?:-([?.\d]+)x)? and ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "option",
						description: "기존 버프 및 능력치 변화",
						regex: /allowing override/,
						radioGroup: "targets",
						groups: [5],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [5],
						cssClasses: ["min-width-6"],
					},
					{
						type: "number",
						description: "Lower Bound:",
						groups: [1, 2],
					},
					{
						type: "number",
						description: "Upper Bound:",
						groups: [3, 4],
					},
					{
						type: "number",
						description: "턴:",
						groups: [6, 7],
					},
				],
			},

			{
				name: "다음 턴 효과: 공격력 상승",
				targets: ["special", "superSpecial"],
				regex:
					/(Following the activation.+boosts.+ATK|If during that turn.+boosts.+ATK)/i,
			},

			{
				name: "old히트 데미지에 n%추가 가산",
				targets: ["potential"],
				regex: /Critical Hit/i,
			},

			{
				name: "히트 데미지에 n%추가 가산",
				targets: ["potential"],
				regex:
					/If you hit a PERFECT with this character, there is an? ([?\d]+)% chance to deal ([?\d]+)% of this character's attack in extra damage/i,
				submatchers: [
					{
						type: "number",
						description: "Chance:",
						groups: [1],
					},
					{
						type: "number",
						description: "Extra Damage Percentage:",
						groups: [2],
					},
				],
			},

			{
				// Split from "Enrage/Reduce Increase Damage Taken" PA
				name: "격노",
				targets: ["potential"],
				regex: /Boosts base ATK by ([?\d]+) the turn after taking damage/i,
				submatchers: [
					{
						type: "number",
						description: "고정 상승 수치:",
						groups: [1],
					},
				],
			},

			{
				// Split from "Nutrition/Reduce Hunger Stacks" PA
				name: "일정 회복량 이상시 능력상승",
				targets: ["potential"],
				// it is a variable atk boost, going 0-x when it has "up to"
				regex:
					/Boosts base ATK by (up to )?([?,\d]+) the turn after recovering (up to )?([?,\d]+) HP/i,
				submatchers: [
					{
						type: "number",
						description: "공격력 상승",
						groups: [2],
					},
					{
						type: "option",
						description: "일정 조건달성시 공격력상승",
						regex: /^up/,
						groups: [1, 3],
						cssClasses: ["min-width-12"],
					},
					{
						type: "number",
						description: "필요한 회복량",
						groups: [4],
					},
				],
			},

			{
				name: "적 전체 타겟인정",
				targets: ["special", "superSpecial"],
				regex:
					/Inflicts all (?:the )?enemies with Set Target, increasing damage taken from (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x(?:-([?.\d]+)x)? and reducing special cooldown of (?=((?:[^c."]+|c(?!har))*))\4characters?(?: by ([?\d]+\+?)(?:-([?\d]+))? turns?)(?:\D+,) for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "효과 지속 턴",
						groups: [7, 8],
					},
					{
						type: "separator",
						description: "---데미지 증가 관련 효과---",
					},
					{
						type: "number",
						description: "데미지 증가 배율",
						groups: [2, 3],
					},
					{
						type: "separator",
						description: "데미지 증가 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "데미지 증가 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "---필살기 턴 단축 관련---",
					},
					{
						type: "number",
						description: "필살기 턴 단축:",
						groups: [5, 6],
					},
					{
						type: "separator",
						description: "필살기 턴 단축 속성",
					},
					...createTypesSubmatchers([4]),
					{
						type: "separator",
						description: "필살기 턴 단축 타입",
					},
					...createClassesSubmatchers([4]),
				],
			},

			{
				name: "구역",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Applies Territory: (?=((?:[^ct."]+|c(?!lass)|t(?!ype))*))\1(?:class|type) to the field, boosts ATK by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, (\D+?),)? and reduces damage received by ([?.\d]+)%(?:-([?.\d]+)%)? (?:based|depending) on number of characters matching the territory, for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "비율:",
						groups: [5, 6],
					},
					{
						type: "number",
						description: "턴:",
						groups: [7, 8, 9, 10],
					},
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "크리티컬 확률",
				targets: ["captain", "special", "superSpecial", "swap"],
				regex:
					/Boosts Critical Hit Rate of (?=((?:[^c."]+|c(?!har))*))\1characters? by(?: up to)? ([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "효과 지속 턴",
						groups: [4, 5],
					},
					{
						type: "number",
						description: "치명타 확률 증가율:",
						groups: [2, 3],
					},
					{
						type: "separator",
						description: "치명타 확률 적용 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "치명타 확률 적용 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "크리티컬 데미지",
				targets: ["captain", "special", "superSpecial", "swap"],
				regex:
					/Boosts Critical Hit Damage of (?=((?:[^c."]+|c(?!har))*))\1characters? by(?: up to)? ([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "효과 지속 턴:",
						groups: [4, 5],
					},
					{
						type: "number",
						description: "크리티컬 데미지 상승 확률:",
						groups: [2, 3],
					},
					{
						type: "separator",
						description: "크리티컬 데미지 상승 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "크리티컬 데미지 상승 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "약점 타입에게 주는 영향",
				targets: ["special", "superSpecial", "support"],
				regex:
					/Boosts Advantageous Class Effect of (?=((?:[^c."]+|c(?!har))*))\1characters? by(?: up to)? ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "약점 타입에게 주는 영향 증가 턴:",
						groups: [4, 5],
					},
					{
						type: "number",
						description: "약점 타입에게 주는 영향 증가 배수:",
						groups: [2, 3],
					},
					{
						type: "separator",
						description: "약점 타입에게 주는 영향 증가 적용 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "마지막 탭",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/boosts Final Tap ATK of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)%(?:-([?.\d]+)%)?(?:, by ([?.\d]+)%(?:-([?.\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3, 4, 5],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "데미지 감소상태 비율에 따른 공격력 상승",
				targets: ["captain", "special", "superSpecial"],
				regex:
					/boosts Crew Damage Reduction to ATK of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x-([?.\d]+)x, proportional to the strength of crew's Percent Damage Reduction buff, for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
					...createUniversalSubmatcher([1]),
					// {
					// 	type: "separator",
					// 	description: "영향을 받는 속성:",
					// },
					// ...createTypesSubmatchers([1]),
					// {
					// 	type: "separator",
					// 	description: "영향을 받는 타입:",
					// },
					// ...createClassesSubmatchers([1]),
				],
			},
			{
				name: "적의 데미지 감소상태 비율에 따른 공격력 상승",
				targets: ["special"],
				regex:
					/boosts Enemy Damage Reduction to ATK of (?=((?:[^c."]+|c(?!har))*))\1characters? by ([?.\d]+)x-([?.\d]+)x, proportional to the strength of enemies' Percent Damage Reduction buff, for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "초월 속성",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Boosts Super (?:Type|Class) Effects of (?=((?:[^c."]+|c(?!har))*))\1characters to ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},
		],
		"버프 변경": [
			{
				name: "old버프 지속시간 연장",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /increases duration of any/i,
			},

			{
				name: "버프 지속시간 연장",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"support",
					"sailor",
				],
				regex:
					/increases duration of any ([^."]+?)by ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3],
					},
					// following should also match "...boosting"
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "슬롯",
						regex: /Orb (?:Amplification|boost|effect)/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "속성상성",
						regex: /Color Affinity/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "기본 공격력",
						regex: /Base ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일정조건시 공격력상승",
						regex: /Status ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 고정",
						regex: /Chain Lock/i, // should also match "Chain Lock/Limit/Boundary"
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 상승/가산",
						regex: /Chain Addition/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 배수",
						regex: /(?:Chain Multiplication|Chain Multiplier Growth Rate)/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "체인 탭타이밍",
						regex: /Chain Tap Timing/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "기타",
					},
					{
						type: "option",
						description: "데미지 감소상태",
						regex: /Percent Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "일정 이상데미지 감소상태",
						regex: /Threshold Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "턴 종료시 데미지",
						regex: /End of Turn Damage/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "턴 종료시 회복",
						regex: /End of Turn Healing/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "버프 지속시간 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"support",
					"sailor",
				],
				regex:
					/decreases duration of any ([^."]+?)by ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3],
					},
					// following should also match "...boosting"
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "슬롯",
						regex: /Orb (?:Amplification|boost|effect)/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "속성상성",
						regex: /Color Affinity/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "기본 공격력",
						regex: /Base ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일정조건시 공격력상승",
						regex: /Status ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 고정",
						regex: /Chain Lock/i, // should also match "Chain Lock/Limit/Boundary"
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 상승/가산",
						regex: /Chain Addition/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 배수",
						regex: /(?:Chain Multiplication|Chain Multiplier Growth Rate)/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "체인 탭타이밍",
						regex: /Chain Tap Timing/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "기타",
					},
					{
						type: "option",
						description: "데미지 감소상태",
						regex: /Percent Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "일정 이상데미지 감소상태",
						regex: /Threshold Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "턴 종료시 데미지",
						regex: /End of Turn Damage/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "턴 종료시 회복",
						regex: /End of Turn Healing/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				// Just a copy from Buff Duration Extenders, except only damage-boosting buffs
				name: "버프/디버프 강화",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"support",
					"sailor",
				],
				// Roger/WB "increases or decreases"
				regex:
					/increases (?:or decreases )?boost effects of ([^."]+?)(?:by \+?([?.\d]+)x?(?:-([?.\d]+)x)?|to ([?.\d]+)x(?:-([?.\d]+)x)?)/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "설정 값:",
						groups: [4, 5],
					},
					// following should also match "...boosting"
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "슬롯",
						regex: /Orb (?:Amplification|boost|effect)/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "속성상성",
						regex: /Color Affinity/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "기본 공격력",
						regex: /Base ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일정조건시 공격력상승",
						regex: /Status ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 고정",
						regex: /Chain Lock/i, // should also match "Chain Lock/Limit/Boundary"
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 상승/가산",
						regex: /Chain Addition/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 배수",
						regex: /(?:Chain Multiplication|Chain Multiplier Growth Rate)/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "체인 탭타이밍",
						regex: /Chain Tap Timing/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "적이 받는 데미지 상승 버프",
					},
					{
						type: "option",
						description: "적이 받는 데미지 상승",
						regex: /Increase Damage Taken/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
				],
			},

			{
				name: "이중 강화 버프",
				targets: [
					"captain",
					"special",
					"superSpecial",
				],
				regex:
					/enables ([^."]+?) to be enhanced up to 2 times/i,
				submatchers: [
					// following should also match "...boosting"
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "슬롯",
						regex: /Orb (?:Amplification|boost|effect)/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "속성상성",
						regex: /Color Affinity/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "기본 공격력",
						regex: /Base ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일정조건시 공격력상승",
						regex: /Status ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 고정",
						regex: /Chain Lock/i, // should also match "Chain Lock/Limit/Boundary"
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 상승/가산",
						regex: /Chain Addition/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 배수",
						regex: /(?:Chain Multiplication|Chain Multiplier Growth Rate)/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "체인 탭타이밍",
						regex: /Chain Tap Timing/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "적이 받는 데미지 상승",
					},
					{
						type: "option",
						description: "적이 받는 데미지상승",
						regex: /Increase Damage Taken/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
				],
			},
		],
		"능력 발동 조건": [
			{
				name: "턴 제한 효과",
				targets: ["captain"],
				regex: /for \d+ turn/i,
			},

			{
				name: "Old HP-based ATK %target%",
				targets: ["captain"],
				regex:
					/(?:Boosts|their) ATK(?:(?!\.\D)[^"])+?depending on the crew's current HP/i,
			},

			{
				name: "조건: 일정 체력",
				targets: ["captain"],
				// make sure that it doesn't "jump over" "boosts", which would be a different type of boost already
				// "explicit greedy alternation"
				// should NOT match "Boosts ATK of Striker characters by 2x, reduces damage received up to 30% depending on the crew's current HP"
				regex:
					/(?:Boosts|their) ATK(?=(([^b."]+|b(?!y |oosts)|\.[?\d])+))\1by ([?.\d]+)x(?:-([?.\d]+)x)?,? depending on the crew's current HP/i,
			},

			{
				name: "조건: 팀 편성",
				targets: ["captain", "special"],
				regex: /your crew/i,
			},

			{
				name: "조건: 모험 도중 선장",
				targets: ["captain"],
				regex: /becomes your captain/i,
			},

			{
				name: "조건: 탭 타이밍",
				targets: ["captain"],
				regex: /(after scoring|following a chain|perfect|great|good)/i,
			},

			{
				name: "Old Type-boosting %target%",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/Boosts (ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of[^(,.)]+(STR|DEX|QCK|PSY|INT|Type)\b/i,
			},

			{
				name: "조건: 속성",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// include "Dominant Type" boosters
				regex:
					/Boosts (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of ((?:(?!char)[^."])*?(?:\[(?:STR|DEX|QCK|PSY|INT)\]|Type)[^."]+?)character/i,
				submatchers: [...createTypesSubmatchers([1])],
			},

			{
				name: "조건: 속성",
				targets: ["sailor"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// include "Dominant Type" boosters
				regex:
					/Boosts base (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of ((?:(?!char)[^."])*?(?:\[(?:STR|DEX|QCK|PSY|INT)\]|Type)[^."]+?)character/i,
				submatchers: [...createTypesSubmatchers([1])],
			},

			{
				name: "Old Class-boosting %target%",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/Boosts (ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of[^(,.)]+(Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)/i,
			},

			{
				name: "조건: 타입",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one class (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				regex:
					/Boosts (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of ((?:(?!char)[^."])*?(?:Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)[^."]+?)character/i,
				submatchers: [...createClassesSubmatchers([1])],
			},

			{
				name: "조건: 타입",
				targets: ["sailor"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one class (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				regex:
					/Boosts base (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) of ((?:(?!char)[^."])*?(?:Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)[^."]+?)character/i,
				submatchers: [...createClassesSubmatchers([1])],
			},

			{
				name: "해석중Multiple Stage",
				targets: ["special"],
				regex: /description/i,
			},

			{
				name: "조건: 일정 체력",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /if HP is (below|above)/i,
			},

			{
				name: "조건: 받은 데미지",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(if total Damage Taken is|Every turn Damage Taken exceeds)/i,
			},

			{
				name: "조건: 최대체력 초과 회복",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /If there is more than \d+(,\d+)* Excess Healing done /i,
			},

			{
				name: "조건: 슬롯 일치",
				targets: ["captain"],
				regex: /if they have a beneficial orb/i,
			},

			{
				name: "조건: 일당 슬롯 구성",
				targets: ["special"],
				regex: /your( crew.+characters with|.+Captain's orb is)/i,
			},

			{
				name: "Old 특정 선장 전용 %target%",
				targets: ["special"],
				regex: /your captain /i,
			},

			{
				name: "특정 선장 전용 %target%",
				targets: ["special"],
				// match "If Zoro is your Captain or Friend/Guest Captain"
				// match "If your Captain is a Striker character"
				// match "If your captain is a [INT] or [PSY] character"
				// match "If during that turn, you hit 2 PERFECTS and your Captain is a Shooter character" (1665)
				// should NOT match "Swaps this unit with your captain for 2 turns"
				// should NOT match "boosts ATK of your Captain character by ..."
				regex: /your captain is|is your captain/i,
			},

			{
				name: "Old Universal Orb boosting %target%",
				targets: ["special"],
				regex: /Boosts Orb Effects of[^(,.)]+(all characters)/i,
			},

			{
				name: "슬롯 영향 증폭: 일당",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// interpret "Captain's Type", "Dominant Type", "each Type" as universal
				regex:
					/Boosts Orb Effects of ((?:(?!char)[^."])*?(?:all|type)[^."]+?)character/i,
			},

			{
				name: "Old Type-boosting Orb boosting %target%",
				targets: ["special"],
				regex: /Boosts Orb Effects of([^,.]+)(STR|DEX|QCK|PSY|INT|Type)\b/i,
			},

			{
				name: "슬롯 영향 증폭: 속성",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// include "Dominant Type" boosters
				// should match "boosts Orb Effects of [PSY] and Slasher characters"
				regex:
					/Boosts Orb Effects of ((?:(?!char)[^."])*?(?:\[(?:STR|DEX|QCK|PSY|INT)\]|Type)[^."]+?)character/i,
				submatchers: [...createTypesSubmatchers([1])],
			},

			{
				name: "Old Class-boosting Orb boosting %target%",
				targets: ["special"],
				regex:
					/Boosts Orb Effects of[^(,.)]+(Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)/i,
			},

			{
				name: "슬롯 영향 증폭: 타입",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one class (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// should match "boosts Orb Effects of [PSY] and Slasher characters"
				regex:
					/Boosts Orb Effects of ((?:(?!char)[^."])*?(?:Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)[^."]+?)character/i,
				submatchers: [...createClassesSubmatchers([1])],
			},

			{
				name: "속성상성: 일당",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// interpret "Captain's Type", "Dominant Type", "each Type" as universal
				regex:
					/Boosts (?:the )?Color Affinity of ((?:(?!char)[^."])*?(?:all|type)[^."]+?)character/i,
			},

			{
				name: "속성상성: 속성",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one type (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// include "Dominant Type" boosters
				// should match "boosts Color Affinity of [PSY] and Slasher characters"
				regex:
					/Boosts (?:the )?Color Affinity of ((?:(?!char)[^."])*?(?:\[(?:STR|DEX|QCK|PSY|INT)\]|Type)[^."]+?)character/i,
				submatchers: [...createTypesSubmatchers([1])],
			},

			{
				name: "속성상성: 타입",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// `(?:(?!char)[^."])*?` is a "tempered dot"
				// ensure that there is one class (there could be abilities that boost type and classes)
				// make it stop when it finds "char" (characters)
				// should match "boosts Color Affinity of [PSY] and Slasher characters"
				regex:
					/Boosts (?:the )?Color Affinity of ((?:(?!char)[^."])*?(?:Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)[^."]+?)character/i,
				submatchers: [...createClassesSubmatchers([1])],
			},

			{
				name: "마지막라운드시 %target%",
				targets: ["support"],
				regex: /final stage/i,
			},

			{
				name: "특정 라운드 시작시 %target%",
				targets: ["support"],
				regex: /when you reach the (\d+)\w{2} stage/i,
				submatchers: [
					{
						type: "number",
						description: "Stage:",
						groups: [1],
					},
				],
			},

			{
				name: "모험 도중 1회 %target%",
				targets: ["support"],
				regex: /uses (their|a).+special/i,
			},

			{
				name: "비율 데미지 또는 직접 데미지를 주는 필살기 발동 시 %target%",
				targets: ["support"],
				regex: /Damage Dealing/i,
			},

			{
				name: "적이 버프 상태 효과를 발동시 %target%",
				targets: ["support"],
				regex: /when (the|an) enemy (gains|applies)/i,
			},

			{
				name: "적이 디버프 상태효과를 발동시 %target%",
				targets: ["support"],
				regex: /when (the|an) enemy inflicts/i,
			},

			{
				name: "탭 타이밍에 따라 %target%",
				targets: ["support"],
				regex: /PERFECT|GREAT|GOOD/,
			},

			{
				name: "Old Type-Supporting %target%",
				targets: ["support"],
				regex: /^[^,]+(STR|DEX|QCK|PSY|INT)\b/i,
			},

			{
				name: "서포트 대상: 속성 기준",
				targets: ["support"],
				regex:
					/^\[\{"Characters":"((?:(?!char)[^."])*?(?:\[(?:STR|DEX|QCK|PSY|INT)\]|Type)[^."]+?)character/i,
				submatchers: [...createTypesSubmatchers([1])],
			},

			{
				name: "Old Class-Supporting %target%",
				targets: ["support"],
				regex:
					/^[^,]+(Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)/i,
			},

			{
				name: "서포트 대상: 타입 기준",
				targets: ["support"],
				regex:
					/^\[\{"Characters":"((?:(?!char)[^."])*?(?:Slasher|Striker|Fighter|Shooter|Free Spirit|Cerebral|Powerhouse|Driven)[^."]+?)character/i,
				submatchers: [...createClassesSubmatchers([1])],
			},

			{
				name: "서포트 대상: 모두",
				targets: ["support"],
				regex: /^\[\{"Characters":"All character/i,
			},

			{
				name: "서포트 대상: 연관 캐릭터",
				targets: ["support"],
				// if the supported does not have "character", it is a list of family names
				// the target string is JSON stringified, so there is no space in `":"`
				regex: /"Characters":"((?:(?!character)[^"])+)"/i,
				submatchers: [
					{
						type: "text",
						description: "Family:",
						groups: [1],
					},
				],
			},

			{
				name: "필살기 발동시 필턴 단축",
				targets: ["sailor"],
				regex:
					/When any.+character uses a special, reduces special cooldown of this character/i,
			},

			{
				name: "일정 조건 이후 발동",
				targets: ["special"],
				regex: /(Following the activation|If during that turn|After \d+ turn)/i,
			},

			{
				name: "일정 조건 이후 발동: 턴",
				targets: ["special"],
				regex: /After (\d+) turn/i,
				submatchers: [
					{
						type: "number",
						description: "지속 턴:",
						groups: [1],
					},
				],
			},

			{
				name: "일정 조건 이후 발동: 탭타이밍",
				targets: ["special"],
				regex:
					/If during that turn you score (\d|all) (GOOD|GREAT|PERFECT) hits/i,
				submatchers: [
					{
						type: "number",
						description: "탭 횟수:",
						groups: [1],
					},
					{
						type: "option",
						description: "Good",
						regex: /Good/i,
						groups: [2],
						cssClasses: ["min-width-4"],
					},
					{
						type: "option",
						description: "Great",
						regex: /Great/i,
						groups: [2],
						cssClasses: ["min-width-4"],
					},
					{
						type: "option",
						description: "Perfect",
						regex: /Perfect/i,
						groups: [2],
						cssClasses: ["min-width-4"],
					},
				],
			},

			{
				name: "조건: 일당의 특정효과보유",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/If your crew (?:has|is) ([^."]+?) when the special is activated,/i,
				submatchers: [
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "슬롯",
						regex: /Orb (?:Amplification|boost|effect)/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "속성상성",
						regex: /Color Affinity/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "기본 공격력",
						regex: /Base ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일정조건시 공격력상승",
						regex: /Status ATK boost/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 고정",
						regex: /Chain Lock/i, // should also match "Chain Lock/Limit/Boundary"
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 상승/가산",
						regex: /Chain Addition/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "체인 배수",
						regex: /Chain Multiplication/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "방어 회복 계열",
					},
					{
						type: "option",
						description: "데미지 감소상태",
						regex: /Percent Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "일정 이상데미지 감소상태",
						regex: /Threshold Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "버티기",
						regex: /Resilience/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "턴 종료시 회복",
						regex: /End of Turn Healing/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "기타 버프",
					},
					{
						type: "option",
						description: "턴 진행 효과",
						regex: /Turn Progress Effect/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "디버프",
					},
					{
						type: "option",
						description: "봉쇄",
						regex: /Bind/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "선장효과무효",
						regex: /Despair/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "마비",
						regex: /Paralysis/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "필살기 봉쇄",
						regex: /Special Bind/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일반 공격",
						regex: /Normal Attack Only/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
				],
			},

			{
				name: "조건: 적 상태이상",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/If enemies (?:have|are) ([^."]+?) (?:when the special is activated|after receiving damage),/i,
				submatchers: [
					{
						type: "separator",
						description: "디버프 면역",
					},
					{
						type: "option",
						description: "모두",
						regex: /All Debuff Protection/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "지연",
						regex: /Delay Debuff Protection/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "독",
						regex: /Poison Debuff Protection/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "방어력 감소",
						regex: /Defense Reduction Debuff Protection/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "데미지 강화 버프",
					},
					{
						type: "option",
						description: "공격력",
						// could've used negative lookbehind, but some platforms don't support it
						// either ATK boosting buffs or ATK UP or ATK boost
						regex: /(?:^|(?!base|atus).{4} )ATK (?:boost|UP)/i, // do not match "기본 공격력 상승" and "상태 이상시공격력 상승"
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "격노",
						regex: /Enrage/i,
						groups: [1],
						cssClasses: ["min-width-3"],
					},
					{
						type: "option",
						description: "턴 종료시 데미지",
						regex: /End of Turn Damage/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "방어 회복 계열",
					},
					{
						type: "option",
						description: "방어력 상승",
						regex: /Increased Defense/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "데미지 감소상태",
						regex: /Percent Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "일정 이상데미지 감소상태",
						regex: /Threshold Damage Reduction/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "버티기",
						regex: /Resilience/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "베리어",
						regex: /Barrier/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "턴 종료 후 회복",
						regex: /End of Turn Heal/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "separator",
						description: "디버프",
					},
					{
						type: "option",
						description: "지연",
						regex: /delayed/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "독",
						regex: /inflicted with poison/i,
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "메로 메로",
						regex: /Melo-Melo/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
					{
						type: "option",
						description: "방어력 감소",
						regex: /reduced defense/i,
						groups: [1],
						cssClasses: ["min-width-12"],
					},
				],
			},
		],
		회복생존계열: [
			{
				name: "회복",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Recovers/i,
			},

			{
				name: "Old Pinch Healing",
				targets: ["potential"],
				regex: /Pinch Healing/i,
			},

			{
				name: "긴급 회복",
				targets: ["potential"],
				regex:
					/If HP is below ([?\d]+)% at the start of the turn, recovers ([?.\d]+)x this character's RCV at the end of the turn for each time you hit a PERFECT with this character/i,
				submatchers: [
					{
						type: "number",
						description: "체력 비율:",
						groups: [1],
					},
					{
						type: "number",
						description: "회복력 배수:",
						groups: [2],
					},
				],
			},

			{
				name: "Old RCV based Healers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Recovers.+ character's RCV/i,
			},

			{
				name: "회복: 회복력기반",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Recovers ([?.\d]+)x(?:-([?.\d]+)x)? (?:this |supported )?character's RCV/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Fixed HP Healers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Recovers (\d|,)+ HP/i,
			},

			{
				name: "회복: 고정",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Recovers ([?,\d]+)(?:-([?,\d]+))? HP/i,
				submatchers: [
					{
						type: "number",
						description: "HP:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old MAX HP based Healers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /(Recovers all missing HP|Recovers.+ crew\'s MAX HP)/i,
			},

			{
				name: "회복: 최대체력의n%",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:Recovers all missing HP|Recovers ([?\d]+)%(?:-([?\d]+)%)? of crew's MAX HP)/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "회복: 체력n%이하시",
				targets: ["special", "swap", "support"],
				regex: /Recovers[^."]+?missing HP/i,
			},

			{
				name: "회복: 체력초과회복",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /Recovers[^."]+?allowing HP Overfill/i,
			},

			{
				name: "Old End-of-Turn Healers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Recovers.+HP at the end of (?:the|each) turn/i,
			},

			{
				name: "회복: 턴 종료시",
				targets: ["captain"],
				regex: /Recovers[^."]+?HP at the end of (?:the|each) turn/i,
			},

			{
				name: "회복: 턴 종료시",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Recovers[^."]+?HP at the end of (?:the|each) turn for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "최대 체력 초과 회복",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Allows HP Overfill/i,
			},

			{
				name: "Old Damage reducing %target%",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Reduces (any )?damage (received|taken)/i,
			},

			{
				name: "받는 데미지감소 - %단위(패시브)",
				targets: ["captain", "support"],
				// Reduces damage received from [STR] characters by 1%
				// Reduces damage received by 10%-20%
				// match "If you don't attack with Bartolomeo, reduces damage received by 30% for that turn", because CAs like these don't apply icon buffs
				// should not match "Reduces damage received from [STR] characters by 10% for 1 turn"
				// put the second "Percentage" group in an atomic group, so it doesn't backtrack just to fulfill the negative lookahead, or else the negative lookahead could be true and create false positives
				regex:
					/Reduces (?:any )?damage (?:received|taken) (?:from ([^."]+?)(?:characters?|enemies) )?by ([?.\d]+)%(?=((?:-([?.\d]+)%)?))\3(?! for [?\d]+\+?(?:-[?\d]+)? turn)(?:, by ([?.\d]+)%(?:-([?.\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 4, 5, 6],
					},
					{
						type: "option",
						description: "모든 적 데미지",
						regex: /^$/,
						groups: [1],
					},
					{
						type: "separator",
						description: "해당 속성으로부터 받는 데미지:",
					},
					...createTypesSubmatchers([1], true, "^$"),
				],
			},

			{
				name: "받는 데미지감소 - %단위",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// Reduces damage received from [STR] characters by 100% for 2 turns
				// Reduces damage received by 10%-20% for 1-2 turns, by 30-50% for 3-4 turns instead...
				regex:
					/Reduces (?:any )?damage (?:received|taken) (?:from ([^".]+?)(?:characters?|enemies) )?by ([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)%(?:-([?.\d]+)%)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "option",
						description: "모든 적 데미지",
						regex: /^$/,
						groups: [1],
					},
					{
						type: "separator",
						description: "해당 속성으로부터 받는 데미지:",
					},
					...createTypesSubmatchers([1], true, "^$"),
				],
			},

			{
				name: "Old Damage Reduction",
				targets: ["potential"],
				regex: /Damage Reduction/i,
			},

			{
				name: "데미지 감소",
				targets: ["potential"],
				// while it is possible to use `...createTypesSubmatchers([1])` here,
				// due to different potential abilites not matchable in one regex
				// (filtering for both STR and DEX Damage Reduction), it would be
				// impossible to filter for multiple Damage Reduction abilities, thus
				// there are separate ones for each type (which would allow "and")
				regex:
					/Reduces damage taken from \[(?:STR|DEX|QCK|PSY|INT)\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "데미지 감소: 힘속성",
				targets: ["potential"],
				regex:
					/Reduces damage taken from \[STR\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "데미지 감소: 기속성",
				targets: ["potential"],
				regex:
					/Reduces damage taken from \[DEX\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "데미지 감소: 속속성",
				targets: ["potential"],
				regex:
					/Reduces damage taken from \[QCK\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "데미지 감소: 심속성",
				targets: ["potential"],
				regex:
					/Reduces damage taken from \[PSY\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "데미지 감소: 지속성",
				targets: ["potential"],
				regex:
					/Reduces damage taken from \[INT\] (?:characters|enemies) by ([?\d]+)%/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1],
					},
				],
			},

			{
				name: "Old Threshold Damage reducers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Reduces (any )?damage (?:received|taken) above/i,
			},

			{
				name: "데미지 감소 - 패시브: 일정데미지",
				//targets: [ 'captain' ],
				targets: [],
				// reduces any damage received above 5,000 HP by 95% for 2 turns
				// put the second "Percentage" group in an atomic group, so it doesn't backtrack just to fulfill the negative lookahead, or else the negative lookahead could be true and create false positives
				regex:
					/Reduces (?:any )?damage (?:received|taken) above ([?,\d]+)(?:-([?,\d]+))? HP by ([?.\d]+)%(?=((?:-([?.\d]+)%)?))\4(?! for [?\d]+\+?(?:-[?\d]+)? turn)(?:, by ([?.\d]+)%(?:-([?.\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "초과 데미지 값:",
						groups: [1, 2],
					},
					{
						type: "number",
						description: "비율:",
						groups: [3, 5, 6, 7],
					},
				],
			},

			{
				name: "데미지 감소 - 일정 데미지이상",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Reduces (?:any )?damage (?:received|taken) above ([?,\d]+)(?:-([?,\d]+))? HP by ([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "초과 데미지 값:",
						groups: [1, 2],
					},
					{
						type: "number",
						description: "비율:",
						groups: [3, 4, 7, 8],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5, 6, 9, 10],
					},
				],
			},

			{
				name: "Old Damage nullifiers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Reduces (?:any )?damage (?:received|taken)[^%]+100%/i,
			},

			{
				name: "데미지 무효",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// match "reduces damage received from [STR] and [PSY] enemies by 100% for 1 turn"
				// match "Reduces damage received by 70%-100% for 1 turn"
				// match "reduces any damage received above 2,000 HP by 100% for 1 turn" (3282)
				regex:
					/Reduces (?:any )?damage (?:received|taken) (?:above [?\d,]+ HP )?(?:from ([^."]+?)(?:characters?|enemies) )?by (?:100%|[?.\d]+%-100%) for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5],
					},
					{
						type: "option",
						description: "모든 적 데미지",
						regex: /^$/,
						groups: [1],
					},
					{
						type: "separator",
						description: "해당 속성으로부터 받는 데미지:",
					},
					...createTypesSubmatchers([1], true, "^$"),
				],
			},

			{
				name: "데미지 감소: 체력이 가득 찼을때",
				targets: ["captain"],
				regex: /Reduces (any )?damage.+if HP.+99/i,
			},

			{
				name: "Old Zombies",
				targets: ["captain", "special", "superSpecial", "support"],
				regex: /Protects from defeat/i,
			},

			{
				name: "체력이 일정이상인경우 쓰러지지않음",
				targets: ["captain"],
				regex: /Protects from defeat/i,
			},

			{
				name: "체력이 일정이상인경우 쓰러지지않음",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /Protects from defeat for ([?\d]+\+?)(?:-([?\d]+))? turn/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "HP 가드",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Activates HP Guard of ([?.\d]+)%(?:-([?.\d]+)%)? effect for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, of ([?.\d]+)%(?:-([?.\d]+)%)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1, 2, 5, 6],
					},
					{
						type: "number",
						description: "턴:",
						groups: [3, 4, 7, 8],
					},
				],
			},
		],
		슬롯: [
			{
				name: "Old Orb Chance Boosters",
				targets: ["captain", "special", "swap", "sailor", "support"],
				regex: /boosts chances of getting.+?orbs/i,
			},

			{
				name: "슬롯 출현율 상승",
				targets: ["captain", "sailor"],
				// "Boosts chances of getting [QCK], [INT] and [RCV] orbs"
				regex: /boosts chances of getting ([^."]+?)orbs/i,
				submatchers: [
					...createOrbsSubmatchers(
						["STR", "DEX", "QCK", "PSY", "INT", "RCV", "TND", "SEMLA", "WANO"],
						[1]
					), // add 'BOMB' AND 'SUPERBOMB' if they exist
					{
						type: "option",
						description: "속성일치",
						regex: /Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
				],
			},

			{
				name: "슬롯 출현율 상승",
				targets: ["special", "swap", "support"],
				// "Boosts chances of getting [QCK], [INT] and [RCV] orbs for 1 turn"

				// tempered dot to prevent spilling for cases like "Boosts chances of getting [PSY] orbs and reduces chances of getting [INT] orbs for 3 turns"
				// should be fixed to have the "for 3 turns" in the first part, however.
				regex:
					/boosts chances of getting ((?:(?!orb)[^."])+?)orbs for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5],
					},
					...createOrbsSubmatchers(
						["STR", "DEX", "QCK", "PSY", "INT", "RCV", "TND", "SEMLA", "WANO"],
						[1]
					), // add 'BOMB' AND 'SUPERBOMB' if they exist
					{
						type: "option",
						description: "속성일치",
						regex: /Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
				],
			},

			{
				name: "Old Beneficial Orb Enablers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /orbs beneficial/i,
			},

			{
				name: "유리 슬롯 취급",
				targets: ["captain", "sailor"],
				regex: /makes ([^".]+?)orbs beneficial for ([^".]+?)characters?/i,
				submatchers: [
					...createUniversalSubmatcher([2]),
					{
						type: "separator",
						description: "유리 슬롯:",
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"TND",
							"BOMB",
							"SEMLA",
							"SUPERBOMB",
						],
						[1]
					),
					{
						type: "option",
						description: "불리 슬롯",
						regex: /Badly Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2]),
				],
			},

			{
				name: "유리 슬롯 취급",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/makes ([^".]+?)orbs beneficial for ([^".]+?)characters? for ([?\d]+\+?)(?:-([?\d]+))? turn/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [3, 4],
					},
					...createUniversalSubmatcher([2]),
					{
						type: "separator",
						description: "유리 슬롯:",
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"TND",
							"BOMB",
							"SEMLA",
							"SUPERBOMB",
						],
						[1]
					),
					{
						type: "option",
						description: "불리 슬롯",
						regex: /Badly Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2]),
				],
			},

			{
				name: "특정슬롯에 의한 공격력배율",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/increases Orb Effects of (?: beneficial)?([^".]+?)orbs to ([?.\d]+)x(?:-([?.\d]+)x)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, to ([?.\d]+)x(?:-([?.\d]+)x)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2],
					},
					{
						type: "number",
						description: "턴:",
						groups: [3, 4],
					},
					...createUniversalSubmatcher([2]),
					{
						type: "separator",
						description: "유리 슬롯:",
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"TND",
							"BOMB",
							"SEMLA",
							"RAINBOW",
							"WANO",
							"SUPERBOMB",
						],
						[1]
					),
					{
						type: "option",
						description: "불리 슬롯",
						regex: /Badly Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
				],
			},

			{
				name: "Old Negative Orb Negators",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /Makes Badly Matching and \[BLOCK\] orbs not reduce damage/i,
			},

			{
				name: "슬롯에 의한 공격력 감소 무효화",
				targets: ["captain", "sailor"],
				regex: /Makes Badly Matching and \[BLOCK\] orbs not reduce damage/i,
			},

			{
				name: "슬롯에 의한 공격력 감소 무효화",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Makes Badly Matching and \[BLOCK\] orbs not reduce damage for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "Old Orb lockers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /locks (orbs|all orbs|orb|own orb|your captain's orb)/i,
			},

			{
				name: "Old1 Orb lockers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /locks((?!chain).)+?orb/i,
			},

			{
				name: "슬롯 고정",
				targets: ["special", "superSpecial", "swap", "support"],
				// "locks orbs for free spirit characters", "...all orbs"
				// not "locks the chain multiplier"
				// TODO: submatchers for group 1
				regex:
					/locks (orbs (?:for|on) (?=((?:[^c."]+|c(?!har))*))\2characters?|all orbs|own orb|your captain's orb|(?:the )?supported character's orb) for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [3, 4, 5, 6],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "Old Orb barrierers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Barriers [^."]+orbs? for/i,
			},

			{
				name: "슬롯 베리어",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Barriers (?=((?:[^o."]+|o(?!rb))*))\1orbs? for ([?\d]+\+?) ((?:GOOD|GREAT|PERFECT|, | and | or )+) hit/i,
				submatchers: [
					{
						type: "option",
						description: "GOOD",
						regex: /GOOD/,
						radioGroup: "1", // remove radio group if unit with "1 GOOD or GREAT hit" arises
						groups: [3],
						cssClasses: ["min-width-4"],
					},
					{
						type: "option",
						description: "GREAT",
						regex: /GREAT/,
						radioGroup: "1", // remove radio group if unit with "1 GOOD or GREAT hit" arises
						groups: [3],
						cssClasses: ["min-width-4"],
					},
					{
						type: "option",
						description: "PERFECT",
						regex: /PERFECT/,
						radioGroup: "1", // remove radio group if unit with "1 GOOD or GREAT hit" arises
						groups: [3],
						cssClasses: ["min-width-4"],
					},
					{
						type: "number",
						description: "Hits:",
						groups: [2],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},
			{
				name: "슬롯 범위확장",
				targets: ["special", "superSpecial", "support"],
				regex:
					/allows crew to perform Super Tandem with ([^".]+?)orbs for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3],
					},
					{
						type: "separator",
						description: "슬롯 범위",
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"BOMB",
							"SEMLA",
							"SUPERBOMB",
							"RAINBOW",
							"WANO",
						],
						[1]
					),
				],
			},
		],
		"슬롯 변환": [
			{
				name: "Old Orb Retainer",
				targets: ["sailor"],
				regex:
					/If this character has.+(STR|DEX|QCK|PSY|INT|RCV).+(GOOD|GREAT|PERFECT)/i,
			},

			{
				name: "슬롯 유지",
				targets: ["sailor"],
				regex:
					/you hit a ([\w ]+?) with (?:him|her|them|this character), keep (?:his|her|their)([^."]+?)orb/i,
				submatchers: [
					{
						type: "separator",
						description: "탭 타이밍",
					},
					{
						type: "option",
						description: "GOOD",
						regex: /GOOD/i,
						cssClasses: ["min-width-4"],
						groups: [1],
					},
					{
						type: "option",
						description: "GREAT",
						regex: /GREAT/i,
						cssClasses: ["min-width-4"],
						groups: [1],
					},
					{
						type: "option",
						description: "PERFECT",
						regex: /PERFECT/i,
						cssClasses: ["min-width-4"],
						groups: [1],
					},
					{
						type: "separator",
						description: "Retained Orb:",
					},
					...createOrbsSubmatchers(
						["STR", "DEX", "QCK", "PSY", "INT", "RCV", "TND"],
						[2]
					), // add others  if they exist
				],
			},

			{
				name: "Old Orb controllers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /(Changes.+?orbs?)/i,
			},

			{
				name: "슬롯 조정: 변경",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// the From orbs is optional in the ability description. If it is not mentioned,
				// it is considered to be "연" orb, just like "changes all orbs" (these are Any orbs)
				// "changes the orb of this character into a Matching orb" (no From orb, so this is Any orb)

				// the "of ____ characters" is optional. If it is not mentioned, it is considered "of all characters"
				// "changes [BLOCK] orbs into [INT] orbs"

				// ", including [BLOCK] orbs," is optional

				// the From orbs part of the regex should not include "changes" (hence the tempered dot),
				// which would mean that the regex would interlap with a different special.
				// ex. "Changes own Type and both Classes to any selected combination, reduces Special Cooldown of all characters by 1 turn, changes all orbs, including [BLOCK] orbs, into [RCV] orbs" (3523)
				// in this case, it's not really a problem since he changes all orbs anyway,
				// but in case he changes only [STR] orbs, it would be a false positive when searching with "From Any orb", because there is "Type" (from "own Type and both Classes") in the first part.

				// "changes all orbs of top and bottom row characters into Matching orbs"
				// "Changes orbs of right column characters into [DEX], [STR] and [QCK], from top to bottom"
				// "changes [STR], [QCK], [DEX], [PSY] and [INT] orbs of right column Shooter and Striker characters into Matching orbs"
				regex:
					/changes (?:the )?((?:(?!changes)[^."])*?)orbs?(, including \[BLOCK\] orbs?,)? (?:of (?=((?:[^c."]+|c(?!har))*))\3characters? )?into([^."]+?)orbs?/i,
				submatchers: [
					{
						type: "separator",
						description: "해당 속성에서:",
					},
					{
						type: "option",
						description: "연",
						regex: /^$|all/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
					{
						type: "option",
						description: "방해",
						regex: /\[BLOCK\]/i,
						cssClasses: ["min-width-6"],
						groups: [1, 2], // the only one that includes group 2, so don't add [BLOCK] to `createOrbsSubmatchers`
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"G",
							"RCV",
							"TND",
							"BOMB",
							"EMPTY",
						],
						[1],
						false
					),
					{
						type: "option",
						description: "속성일치",
						regex: /(?:^|(?!Badly ).{6}|^.{0,5})\bMatching/i, // alternative for negative lookbehind for "Badly " and "Non-"
						cssClasses: ["min-width-6"],
						groups: [1],
					},
					{
						type: "option",
						description: "불리 슬롯",
						regex: /Badly Matching/i,
						cssClasses: ["min-width-6"],
						groups: [1],
					},
					{
						type: "separator",
						description: "해당 속성으로:", // To orbs won't have "연", since simply not selecting any "To" orb does the same thing
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"G",
							"RCV",
							"TND",
							"BOMB",
							"EMPTY",
							"SUPERBOMB",
							"RAINBOW",
							"SEMLA",
							"WANO",
						],
						[4],
						false
					),
					{
						type: "option",
						description: "자신 슬롯",
						regex: /'s|s'/i, // match "this character's orb", "Luffy's orb"
						cssClasses: ["min-width-6"],
						groups: [4],
					},
					{
						type: "option",
						description: "속성일치",
						regex: /(?:^|(?!Badly ).{6}|^.{0,5})\bMatching/i, // alternative for negative lookbehind for "Badly " and "Non-"
						cssClasses: ["min-width-6"],
						groups: [4],
					},
					{
						type: "option",
						description: "불리 슬롯",
						regex: /Badly Matching/i,
						cssClasses: ["min-width-6"],
						groups: [4],
					},
					{
						type: "separator",
						description: "영향을 받는 캐릭터:",
					},
					...createUniversalSubmatcher([3], "all|type|^$"),
					{
						type: "separator",
						description: "속성:",
					},
					...createTypesSubmatchers([3], true, "all|type|^$"),
					{
						type: "separator",
						description: "타입:",
					},
					...createClassesSubmatchers([3], true, "all|^$"),
					{
						type: "separator",
						description: "위치:",
					},
					...createPositionsSubmatchers(
						[3],
						true,
						"all|^$",
						["Selected"],
						false
					),
				],
			},

			{
				name: "슬롯 조정: 자동",
				targets: ["captain", "special", "superSpecial"],
				regex:
					/changes (?=((?:[^o."]+|o(?!rbs))*))\1orbs into (?=((?:[^o."]+|o(?!rbs))*))\2orbs for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [3, 4],
					},
					{
						type: "separator",
						description: "해당 속성에서:",
					},
					{
						type: "option",
						description: "연",
						regex: /^$|all/i,
						cssClasses: ["min-width-12"],
						groups: [1],
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"TND",
							"BOMB",
						],
						[1],
						false
					),
					{
						type: "separator",
						description: "해당 속성으로:", // To orbs won't have "연", since simply not selecting any "To" orb does the same thing
					},
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"RCV",
							"TND",
							"EMPTY",
							"SUPERBOMB",
							"RAINBOW",
							"SEMLA",
							"WANO",
						],
						[2],
						false
					),
				],
			},

			// {
			// 	name: "Orb Control: Stage 1 Full",
			// 	targets: ["sailor"],
			// 	regex: /Changes all orbs into([^."]+?)orbs?/i,
			// 	submatchers: [
			// 		...createOrbsSubmatchers(
			// 			[
			// 				"STR",
			// 				"DEX",
			// 				"QCK",
			// 				"PSY",
			// 				"INT",
			// 				"G",
			// 				"RCV",
			// 				"TND",
			// 				"BOMB",
			// 				"SEMLA",
			// 				"SUPERBOMB",
			// 				"RAINBOW",
			// 				"WANO",
			// 			],
			// 			[1],
			// 			false
			// 		),
			// 		{
			// 			type: "option",
			// 			description: "속성일치",
			// 			regex: /(?:^|(?!Badly ).{6}|^.{0,5})\bMatching/i, // alternative for negative lookbehind for "Badly " and "Non-"
			// 			cssClasses: ["min-width-6"],
			// 			groups: [1],
			// 		},
			// 	],
			// },

			{
				name: "슬롯 조정: 1라운드",
				targets: ["sailor"],
				regex: /Changes (?:the )?orbs? (?:of (?=((?:[^c."]+|c(?!har))*))\1characters? )?into([^."]+?)orbs?/i,
				submatchers: [
					...createOrbsSubmatchers(
						[
							"STR",
							"DEX",
							"QCK",
							"PSY",
							"INT",
							"G",
							"RCV",
							"TND",
							"BOMB",
							"SEMLA",
							"SUPERBOMB",
							"RAINBOW",
							"WANO",
						],
						[2],
						false
					),
					{
						type: "option",
						description: "속성일치",
						regex: /(?:^|(?!Badly ).{6}|^.{0,5})\bMatching/i, // alternative for negative lookbehind for "Badly " and "Non-"
						cssClasses: ["min-width-6"],
						groups: [2],
					},
					{
						type: "separator",
						description: "위치:",
					},
					...createUniversalSubmatcher([1], "모두"),
					...createPositionsSubmatchers(
						[1],
						true,
						"모두",
						["Adjacent", "Selected"],
						true
					),
				],
			},

			{
				name: "슬롯 랜덤 변경",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /randomizes.+orb/i,
			},

			{
				name: "Old Orb Control: Switch",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /switches orbs/i,
			},

			{
				name: "슬롯을 자유롭게 움직임",
				targets: ["special", "superSpecial", "swap", "support"],
				// "Switches orbs between slots 2 times"
				// "Switches orbs between slots 1 time"
				regex: /switches orbs between slots ([?\d]+)(?:-([?\d]+))? times?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},
		],
		"팀 전체 버프": [
			{
				name: "일반공격이 모든 방어효과 무시",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Attacks.+ignore.+damage reducing Barriers( and Buffs|, Buffs and DEF)/i,
			},

			{
				name: "특정 상태 이상 면역",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /applies.+immunity/i,
			},

			{
				name: "일당은 날아가지 않음",
				targets: ["captain"],
				regex: /makes crew immune to Blow Away/i,
			},

			{
				name: "일당은 날아가지 않음",
				targets: ["sailor"],
				regex: /Cannot be Blown away/i,
			},

			{
				name: "베리 획득량 증가",
				targets: ["captain"],
				regex: /boosts[^.]+?Beli[^.]+?(?:gained|received) by ([?.\d]+)x/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1],
					},
				],
			},

			{
				name: "경험치 획득량 증가",
				targets: ["captain"],
				regex: /boosts[^.]+?EXP[^.]+?(?:gained|received) by ([?.\d]+)x/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [1],
					},
				],
			},

			{
				name: "Old Drop Doublers",
				targets: ["captain"],
				regex: /duplicating a drop/i,
			},

			{
				name: "보물 추가획득",
				targets: ["captain"],
				regex: /(guarantees )?duplicating a drop/i,
				submatchers: [
					{
						type: "option",
						description: "Guaranteed",
						regex: /^./,
						groups: [1],
					},
				],
			},

			{
				name: "적의 능력치 표시",
				targets: ["special", "swap", "support"],
				regex: /Displays the status of all enemies/i,
			},

			{
				name: "퍼펙트 타이밍 쉬워짐",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /makes PERFECTs (slightly |significantly )?easier to hit/i,
			},

			{
				name: "필살기 턴 단축",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				// Reduces Special Cooldown of all characters by 3 turns
				// Reduces Special Cooldown of all characters completely
				// Advances Special Cooldown of all characters to MAX
				regex:
					/(?:reduces|advances) Special Cooldown of([^."]+?)characters? (?:(completely)|to (MAX)|by ([?\d]+)(?:-([?\d]+))? turns?)(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "선박 필살기턴 단축",
				targets: [
					"captain",
					"special",
					"support",
				],
				// Reduces Special Cooldown of Ship by 3 turns
				// Reduces Special Cooldown of Ship completely
				// Advances Special Cooldown of Ship to MAX
				regex:
					/(?:reduces|advances) Special Cooldown of(?: your)? Ship (?:(completely)|to (MAX)|by ([?\d]+)(?:-([?\d]+))? turns?)(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5, 6],
					},
				],
			},

			{
				name: "체인지 카운트 단축",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"sailor",
					"support",
					"swap"
				],
				// Reduces Switch Effect of all characters by 3 turns
				// Reduces Switch Effect of all characters completely
				// Advances Switch Effect of all characters to MAX
				regex:
					/(?:reduces|advances)[^."]+?Switch Effect[^."]+?of([^."]+?)characters? (?:(completely)|to (MAX)|by ([?\d]+)(?:-([?\d]+))?)(?:, by ([?\d]+)(?:-([?\d]+))?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "VS 게이지 단축",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"support"
				],
				// Reduces VS Gauge of all characters by 3 turns
				// Reduces VS Gauge of all characters completely
				// Advances VS Gauge of all characters to MAX
				regex:
					/(?:reduces|advances)[^."]+?VS Gauge[^."]+?of([^."]+?)characters? (?:(completely)|to (MAX)|by ([?\d]+)(?:-([?\d]+))?)(?:, by ([?\d]+)(?:-([?\d]+))?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5, 6, 7],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},
		],
		"일당 디버프 효과": [
			{
				name: "공격력 상시감소",
				targets: ["captain"],
				// Can be "reduces ATK of all characters by 1x-2x, by ?x-3x otherwise"
				// Or "reduces HP of Striker characters by 2.5x, their ATK by 2x" (or RCV first)
				// Or "reduces ATK of Slasher characters by 3.25x, by 4.0625x instead if they have a [DEX] or [INT] orb" (or beneficial orb)
				// or "reduces ATK of all characters by 1x-2x, depending on the crew's current HP, and their HP by 2x"
				// But NOT "reduces ATK of Striker characters by 2.5x, reduces their HP by 1.2x"
				// "reduces" should NOT be matched within, which should be a different buff already
				// `","` is the JSON separator for array items
				// wrap the part before "공격력" in an atomic group to prevent backtracking
				// prevent it from jumping over "reduces"
				regex:
					/Reduces (?=((?:[^.abor"]+|a(?!tk)|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes)|"(?!,"))*))\1ATK(?: and HP| and RCV|, HP and RCV)?(?: of ([^."]*?)characters?)? by ([?\d]+)%(?:-([?\d]+)%)?(?:, by ([?\d]+)%(?:-([?\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "체력 상시 감소",
				targets: ["captain"],
				// Can be "reduces HP of all characters by 1x-2x, by ?x-3x otherwise"
				// Or "reduces ATK of Striker characters by 2.5x, their HP by 1.2x"
				// or "reduces ATK of all characters by 1x-2x, depending on the crew's current HP, and their HP by 2x"
				// But not "reduces ATK of Striker characters by 2.5x, reduces their HP by 1.2x"
				// "reduces" should NOT be matched within, which should be a different buff already
				// Also NOT "reduces ATK of [STR] characters by 2.5x and reduces their HP by 60%"
				// not "Boosts ATK of [STR] characters by 2.5x and reduces their HP by 60%" because different buffs
				// NOT "Reduces damage received by 50%, reduces crew's current HP by 10% at the end of each turn"
				// NOT "Reduces any damage received above 10,000 HP by 60% for 99 turns"
				// `","` is the JSON separator for array items. Allow "Special Name"
				regex:
					/Reduces (?=((?:[^.bcdhor"]+|h(?!p (?:and RCV )?(?:by|of))|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes)|"(?!,")|c(?!rew's current HP)|d(?!amage received))*))\1HP(?: and RCV)?(?: of ([^."]*?)characters?)? by ([?\d]+)%(?:-([?\d]+)%)?(?:, by ([?\d]+)%(?:-([?\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "회복력 상시 감소",
				targets: ["captain"],
				// same as ATK and HP
				// should not match "Reduces ATK of all characters by 3x, their HP by 1.25x and recovers 0.5x this character's RCV at the end of the turn"
				regex:
					/Reduces (?=((?:[^.bor"]+|\.\d|b(?!oosts)|of ([^."]+?)characters?|o|r(?!educes|cv[^\]])|"(?!,"))*))\1RCV(?: of ([^."]*?)characters?)? by ([?\d]+)%(?:-([?\d]+)%)?(?:, by ([?\d]+)%(?:-([?\d]+)%)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [4, 5, 6, 7],
					},
					...createUniversalSubmatcher([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([2, 3]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([2, 3], true, undefined, [
						"Adjacent",
						"Selected",
					]),
				],
			},

			{
				name: "공격력 감소",
				targets: ["special", "superSpecial", "swap", "support"],
				/* Uses explicit greedy alternation for "of ...characters", preventing
                backtracking with every character matched in it (easily reaches a
                thousand extra steps), like if there's an ATK boost that has "by 45",
                but no "x" because it's not a multiplier. It also prevents it from
                jumping over "characters" in the mentioned case, as it would no
                longer be able to backtrack. Variable atk boosts and variable turns
                should be accounted for with optional groups, and should handle an
                "otherwise" clause. This part of the regex also uses a workaround
                for atomic groups in JS.

                "If something, boosts ATK, HP and RCV of [PSY], Cerebral and Free
                Spirit characters by 2x-2.5x for 1-2 turns, by 1.5x-2x for 2-3 turns
                otherwise."
            */
				regex:
					/Reduces ATK(?: and HP| and RCV|, HP and RCV)? of (?=((?:[^c."]+|c(?!har))*))\1characters? by (?:([?.\d]+)%(?:-([?.\d]+)%)?|([?.,\d]+)(?:-([?.,\d]+))?) (?:after [?\d\w]+? hit in the chain )?for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by (?:([?.\d]+)%(?:-([?.\d]+)%)?|([?.,\d]+)(?:-([?.,\d]+))?) for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3, 8, 9],
					},
					{
						type: "number",
						description: "Static Reduction:",
						groups: [4, 5, 10, 11],
					},
					{
						type: "number",
						description: "턴:",
						groups: [6, 7, 12, 13],
					},
					...createUniversalSubmatcher([1]),
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
					{
						type: "separator",
						description: "영향 받는 캐릭터 위치:",
					},
					...createPositionsSubmatchers([1]),
				],
			},

			{
				name: "Old Current Health reducers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Reduces crew's current HP/i,
			},

			{
				name: "체력이 일정 비율 감소",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/Reduces crew's current HP (?:by ([?.\d]+)%(?:-([?.\d]+)%)?|to ([?\d]+)(?:-([?\d]+))?)(?:, (?:by ([?.\d]+)%(?:-([?.\d]+)%)?|to ([?\d]+)(?:-([?\d]+))?))?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [1, 2, 5, 6],
					},
					{
						type: "number",
						description: "설정 값:",
						groups: [3, 4, 7, 8],
					},
				],
			},

			{
				name: "필살기 사용시 봉쇄상태",
				targets: ["special", "superSpecial", "swap", "support"],
				// match "Binds self for 2 turns"
				// match "Binds and Despairs himself for 7 turns"
				regex:
					/Binds[^."]+?self for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "자신에게 마비상태 부여",
				targets: ["special", "superSpecial", "swap", "support"],
				// match "Binds and Despairs himself for 7 turns"
				regex:
					/Despairs[^."]+?self for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4],
					},
				],
			},

			{
				name: "체력을 소모시켜 데미지 부여",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/Despairs[^."]+?self for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "separator",
						description:
							"이 필터는 일당의 체력을 감소시키고, 감소된 체력을 기준으로 데미지를 주는 유닛을 포함합니다. 해당 효과는 적이 가한 데미지로 간주됩니다.",
					},
				],
			},
		],
		"상태이상 효과 감소": [
			{
				name: "Old Bind reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes)( bind|.+, bind|.+and bind).+duration/i,
			},

			{
				name: "봉쇄",
				targets: ["captain", "special", "superSpecial", "swap", "sailor"],
				// must not match "선박 봉인" or "특정 봉쇄"
				// there is no swap that will remove bind on themselves, because bind stops all abilities
				regex:
					/(?:reduces|removes)(?: |[^."]+?, |[^."]+? and )bind[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))( (?:for|on) \w+ characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "Selected",
						regex: /./,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "봉쇄",
				targets: ["support"],
				// must not match "선박 봉인" or "특정 봉쇄"
				regex:
					/(?:reduces|removes)(?: |[^."]+?, |[^."]+? and )bind[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))( (?:for|on) the supported character)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "Supported",
						regex: /./,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Ship Bind Reduction",
				targets: ["potential"],
				regex: /Reduce Ship Bind duration/i,
			},

			{
				name: "선박 봉인",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?Ship Bind[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "선박 봉인",
				targets: ["potential"],
				regex:
					/Reduces Ship Bind duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Despair reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+despair.+duration/i,
			},

			{
				name: "선장효과무효",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				// must not match "sailor despair"
				regex:
					/(?:reduces|removes)(?: |[^."]+? and |[^."]+?, )despair[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "선원효과 무효",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes)[^."]+?sailor despair[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Fear/Sailor Despair Reduction",
				targets: ["potential"],
				regex: /Reduces? (own )?Sailor Despair duration/i,
			},

			{
				name: "선원효과 무효",
				targets: ["potential"],
				regex:
					/Reduces? Sailor Despair duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Silence/Special Bind reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(?:reduces|removes).+special bind.+duration/i,
			},

			{
				//name: "Silence (IGN: Special Bind)",
				name: "필살기 봉쇄",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)(?: |[^."]+?, |[^."]+? and )special bind[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "일부 속성/타입",
						regex: /^(?!this|the supported)./,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-12"],
					},
				],
			},

			{
				//name: "Active Ability Silence (IGN: Silence)",
				name: "침묵 상태",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes)[^."]+?silence[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Paralysis reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+paralysis.+duration/i,
			},

			{
				name: "마비",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?paralysis[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					// { // uncomment if such sailor appears
					//     type: 'option',
					//     description: 'Certain types/classes',
					//     regex: /^(?!this)./,
					//     radioGroup: '1',
					//     groups: [4],
					//     cssClasses: ['min-width-12'],
					// },
				],
			},

			{
				name: "Old Poison removers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /removes.+poison.+duration completely/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "독",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:poison|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Special Rewind Restorers",
				targets: ["captain", "sailor"],
				regex: /restores.+special cooldowns?.+rewinded/i,
			},

			{
				name: "필살기 턴 되돌리기",
				targets: ["captain", "sailor"],
				regex:
					/restores special cooldown of ([^."]+?)characters? (?:(completely)|by ([?\d]+)(?:-([?\d]+))? turns?)/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this/,
						radioGroup: "1",
						groups: [1],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /all/,
						radioGroup: "1",
						groups: [1],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Special Cooldown reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(?:reduces|advances) (special )?cooldown/i,
			},

			{
				name: "Old Burn reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+Burn.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "화상",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Burn|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Blindness reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+blindness.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "의성어 은폐",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:blindness|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Stun removers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+stun.+duration/i,
			},

			{
				name: "기절",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(?:reduces|removes)[^."]+?stun/i,
				// regex: /(?:reduces|removes)[^."]+?stun[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))/i,
				// submatchers: [       // uncomment if stun with turns get released, or if a special that reduces stun for turns gets released
				//     {
				//         type: 'number',
				//         description: 'Turns:',
				//         groups: [1, 2, 3],
				//     },
				// ],
			},

			{
				name: "Old Slot Bind reducers",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+Slot Bind.+duration/i,
			},

			{
				name: "슬롯 봉쇄",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?slot bind[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?: on ([^."]+?)characters?)?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 5, 6],
					},
					{
						type: "option",
						description: "자기 자신만",
						regex: /^this|^the supported/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모두",
						regex: /^$/,
						radioGroup: "1",
						groups: [4],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Reduce Slot Bind duration",
				targets: ["potential"],
				regex: /Reduce Slot Bind duration/i,
			},

			{
				name: "슬롯 봉쇄",
				targets: ["potential"],
				regex:
					/Reduces Slot Bind duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Reduce Slot Barrier duration",
				targets: ["potential"],
				regex: /Reduce Slot Barrier duration/i,
			},

			{
				name: "슬롯 베리어",
				targets: ["potential"],
				regex:
					/Reduces Slot Barrier duration (?:by ([?\d]+) stacks?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "상태:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Crew ATK DOWN reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces).+ATK DOWN.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "공격력 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				//Does not match Minimum-Chain or Maximum-Chain ATK DOWN
				regex:
					/(?:reduces|removes)[^."]+?(?<!Chain )(?:ATK DOWN|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "일정 체인계수 이하시 공격력 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				//Does not match Minimum-Chain or Maximum-Chain ATK DOWN
				regex:
					/(?:reduces|removes)[^."]+?(?:Minimum-Chain ATK DOWN|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "일정 체인계수 이상시 공격력 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				//Does not match Minimum-Chain or Maximum-Chain ATK DOWN
				regex:
					/(?:reduces|removes)[^."]+?(?:Maximum-Chain ATK DOWN|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Nutrition/Reduce Hunger Stacks",
				targets: ["potential"],
				regex: /Nutrition/i,
			},

			{
				// Split from "Nutrition/Reduce Hunger Stacks" PA
				name: "공복 내성",
				targets: ["potential"],
				regex: /reduces Hunger stack (?:by ([?\d]+) stacks?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "상태:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Crew RCV DOWN reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces).+RCV DOWN.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "회복력 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:RCV DOWN|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Crew No Healing reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces).+No Healing.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "회복 무효",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:no healing|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "회복시 데미지부여",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Counter-Healing|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Counter-RCV - 번역중",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Counter-RCV|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Reduce No Healing",
				targets: ["potential"],
				regex: /Reduce No Healing/i,
			},

			{
				name: "회복 무효",
				targets: ["potential"],
				regex:
					/Reduces No Healing duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Crew Increase Damage Taken reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces).+Increase Damage Taken.+duration/i,
				include: [2602, 2603, 3398],
			},

			{
				name: "적이 받는 데미지상승",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Increase Damage Taken|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enrage/Reduce Increase Damage Taken",
				targets: ["potential"],
				regex: /Enrage/i,
			},

			{
				// Split from "Enrage/Reduce Increase Damage Taken" PA
				name: "적이 받는 데미지상승",
				targets: ["potential"],
				regex:
					/reduces Increase Damage Taken duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "Old Crew positive buff reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /removes.+positive buffs/i,
			},

			{
				name: "유리효과",
				targets: ["special", "superSpecial", "swap", "sailor", "support"],
				regex: /removes[^."]+?positive buffs/i,
			},

			{
				name: "슬롯 출현율의 상승 또는 감소 효과",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(reduces|removes).+Orb Rate Up and Orb Rate Down.+Buffs/i,
			},

			{
				name: "[유리] 또는 [불리] 슬롯으로 취급",
				targets: ["special"],
				regex:
					/(reduces|removes).+beneficial orb Buff and non-beneficial orb Debuff/i,
			},

			{
				name: "Old Chain Multiplier Limit and Chain Lock reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces)[^.]+Chain Multiplier Limit/i,
			},

			{
				name: "체인계수 고정",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Chain Multiplier Limit|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Chain Coefficient Reduction reducer",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex: /(removes|reduces).+Chain Coefficient Reduction/i,
			},

			{
				name: "체인계수 증가량 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(?:reduces|removes)[^."]+?(?:Chain Coefficient Reduction|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "필살기 사용 제한",
				targets: ["captain", "special", "potential", "support"],
				regex:
					// /(?:reduces|removes)[^."]+?(?: |[^."]+? and |[^."]+?, )?(?:Special Use Limit|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))/i,
					/(?:reduces|removes)[^."]+?(?:Special Use Limit|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "회복력 감소",
				targets: ["potential"],
				regex:
					/Reduces Healing Reduction duration (?:by ([?\d]+) turns?|(completely))/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2],
					},
				],
			},

			{
				name: "선장 교체",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/(optionally )?(?:reduces|removes)[^."]+?Captain Swap[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "option",
						description: "Optional",
						regex: /i/,
						groups: [1],
					},
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5, 6],
					},
				],
			},
			{
				name: "출혈",
				targets: ["captain", "special", "sailor"],
				regex:
					/(?:reduces|removes)[^."]+?(?:Bleed|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},
			{
				name: "격통",
				targets: ["captain", "special", "sailor"],
				regex:
				/(?:reduces|removes)[^."]+?(?:Pain|selected debuffs?)[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "날려버리기",
				targets: [
					"special",
				],
				regex:
					/(?:reduces|removes)[^."]+?Blown Away[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},
		],
		"적에게 상태이상 부여": [
			{
				name: "지연",
				targets: ["captain"],
				regex:
					/(ignores? (?:Delay )?Debuff Protection and )?delays (all enemies|that enemy) by ([?\d]+)(?:-([?\d]+))? turns?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^t/,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^a/,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Delayers",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /delays/i,
			},

			{
				name: "지연",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(ignores? (?:Delay )?Debuff Protection and )?delays (that enemy|all enemies) by ([?\d]+)(?:-([?\d]+))? turns?(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [3, 4, 5, 6],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
					{
						type: "option",
						description: "적 한명",
						regex: /^t/, // no class or type begins with "t" anyway
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^a/,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
				],
			},

			{
				name: "Old Delay Immunity Ignorers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /ignores Delay Debuff Protection/i,
			},

			{
				name: "중독",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores? (?:Defense Reduction )?Debuff Protection and )?(strongly poisons|poisons|Inflicts Toxic)/i,
				submatchers: [
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
					{
						type: "option",
						description: "독",
						regex: /^p/i,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "맹독",
						regex: /^s/i,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "중독",
						regex: /^i/i,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-12"],
					},
				],
			},

			{
				name: "마비",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores (?:Negative )?Debuff Protection and )?Paralyzes \(([?\d]+)%(?:-([?\d]+)%)?\) all enemies for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
				],
			},

			{
				name: "Old Defense reducers",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Reduces the defense/i,
			},

			{
				name: "방어력 감소",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores? (?:Defense Reduction )?Debuff Protection and )?Reduces the defense of all enemies by ([?\d]+)%(?:-([?\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?\d]+)%(?:-([?\d]+)%)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3, 6, 7],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
				],
			},

			{
				name: "화상",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				// "inflicts all enemies with Burn that will deal 100x enemies' ATK in damage for 4 turns that will ignore debuff protection"
				regex:
					/(ignores? (?:Burn )?Debuff Protection and )?inflicts all enemies with Burn that will deal ([?.\d]+)x(?:-([?.\d]+)x)? enemies' ATK in damage for ([?\d]+)(?:-([?\d]+))? turns?(?:, for ([?\d]+)(?:-([?\d]+))? turns?)?( that will ignore debuff protection)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 6, 7],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /./,
						groups: [1, 8],
					},
				],
			},

			{
				name: "네거티브",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores (?:Negative )?Debuff Protection and )?inflicts enemies with Negative for ([?\d]+)(?:-([?\d]+))? turns?(?:, for ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
				],
			},

			{
				name: "메로 메로",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores (?:Melo-Melo )?Debuff Protection and )?inflicts Melo-Melo to (all enemies|enemies that attack you) for ([?\d]+\+?)(?:-([?\d]+))? (additional )?hits/i,
				submatchers: [
					{
						type: "number",
						description: "Hits:",
						groups: [3, 4],
					},
					{
						type: "option",
						description: "적 공격",
						regex: /^e/,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "모든 적",
						regex: /^a/,
						radioGroup: "1",
						groups: [2],
						cssClasses: ["min-width-6"],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
					{
						type: "option",
						description: "추가 히트",
						regex: /a/,
						groups: [5],
					},
				],
			},

			{
				name: "Old Increase Damage Taken %target%",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex: /Inflicts\D+Increase Damage Taken/i,
			},

			{
				name: "적이 받는 데미지상승",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(ignores (?:Increase Damage Taken )?Debuff Protection and )?Inflicts (?:all enemies) with Increase Damage Taken by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)? for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, by ([?.\d]+)x(?:-([?.\d]+)x)?(?:, ([^,]+),)?(?: for ([?\d]+\+?)(?:-([?\d]+))? turns?)?)?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 7, 8],
					},
					{
						type: "number",
						description: "턴:",
						groups: [5, 6, 10, 11],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
					{
						type: "option",
						description: "버프 중첩",
						regex: /can be enhanced up to 2 times/,
						radioGroup: "targets",
						groups: [4, 9],
						cssClasses: ["min-width-6"],
					},					
				],
			},

			{
				name: "내성 감소",
				targets: [
					"captain",
					"special",
					"superSpecial",
					"swap",
					"sailor",
					"support",
				],
				regex:
					/Reduces enemies' (?=((?:[^r."\d]+|r(?!esi))*))\1Resistance by -([?.\d]+)%(?:-([?.\d]+)%)? for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "비율:",
						groups: [2, 3, 4, 5],
					},
					{
						type: "number",
						description: "턴:",
						groups: [4, 5, 8, 9],
					},
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "약체",
				targets: ["captain", "special", "superSpecial", "swap", "support"],
				regex:
					/(Ignores (?:Weakened )?Debuff Protection and )?Inflicts (?:all enemies) with Weaken by ([?.\d]+)x(?:-([?.\d]+)x)?, by ([?.\d]+)x(?:-([?.\d]+)x)? if enemies are inflicted with Increase Damage Taken, for ([?\d]+\+?)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "배율",
						groups: [2, 3, 4, 5],
					},
					{
						type: "number",
						description: "턴:",
						groups: [6, 7, 8, 9],
					},
					{
						type: "option",
						description: "상태이상면역 무시",
						regex: /i/,
						groups: [1],
					},
				],
			},
			{
				name: "강적",
				targets: ["special", "superSpecial"],
				regex:
					/Marks all enemies (?:with ([?.,\d]+) or more MAX HP)/i,
				submatchers: [
					{
						type: "number",
						description: "Enemy's Minimum MAX HP:",
						groups: [1],
					},
				],
			},
			{
				name: "데미지 감소상태",
				targets: ["special", "superSpecial"],
				regex:
					/(ignores? (?:Percent Damage Reduction )?Debuff Protection and )?(?:Reduces|Removes) enemies' damage received by ([?\d]+)%(?:-([?\d]+)%)? for ([?\d]+)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "Damage reduced percentage:",
						groups: [1, 2],
					},
					{
						type: "number",
						description: "턴:",
						groups: [3, 4],
					},
				],
			},
		],
		"적 상태이상 감소": [
			{
				name: "Old Enemy End of Turn Heal buff reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+End of Turn Heal.+duration/i,
			},

			{
				name: "턴 종료 후 회복",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies[^."]+?End of Turn Heal[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy End of Turn Damage/Percent Cut buff reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+End of Turn Damage\/Percent Cut.+duration/i,
			},

			{
				name: "턴 종료시 데미지/비율데미지",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies[^."]+?End of Turn Damage\/Percent Cut[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Enrage buff reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Enrage.+duration/i,
			},

			{
				name: "격노",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies[^."]+?Enrage[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy ATK UP buff reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+ATK UP.+duration/i,
			},

			{
				name: "공격력 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?ATK UP[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Increased Defense reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Increased Defense.+duration/i,
			},

			{
				name: "방어력 상승",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Increased Defense[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Percent Damage Reduction reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Percent Damage Reduction.+duration/i,
			},

			{
				name: "데미지 감소상태",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Percent Damage Reduction[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Damage Nullification reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Damage Nullification.+duration/i,
			},

			{
				name: "데미지 무효",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Damage Nullification[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Threshold Damage Reduction reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Threshold Damage Reduction.+duration/i,
			},

			{
				name: "일정 이상데미지 감소상태",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Threshold Damage Reduction[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "특정 슬롯에 의한 데미지 감소",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Orb-Based Damage Reduction[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Barrier reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Barrier .*duration/i,
			},

			{
				name: "베리어",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Barrier[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "Old Enemy Resilience reducer",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /(removes|reduces).+Resilience.+duration/i,
			},

			{
				name: "버티기",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Resilience[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "유리 효과",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?positive buff[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

			{
				name: "위압",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(?:reduces|removes) enemies'[^."]+?Intimidation[^."]+?duration (?:by ([?\d]+)(?:-([?\d]+))? turns?|(completely))(?:, by ([?\d]+)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [1, 2, 3, 4, 5],
					},
				],
			},

		],
		기타: [
			{
				name: "기본 능력치 패시브만 보유한 캐릭터 제외",
				targets: ["support"],
				regex:
					/"description":[^\]]*?(\["|",")(?!Adds ([?.\d]+)% of this character's base (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV) to the supported character's base (?:ATK|HP|RCV|ATK and HP|ATK and RCV|HP and RCV|ATK, HP and RCV)\.?")[^"]*"/i,
			},

			{
				name: "Old Captain Swapping %target%",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /Swaps this unit with your captain/i,
			},

			{
				name: "선장 교체",
				targets: ["special", "superSpecial", "swap", "support"],
				regex:
					/(optionally )?swaps this unit with your captain for ([?\d]+\+?)(?:-([?\d]+))? turns?(?:, for ([?\d]+\+?)(?:-([?\d]+))? turns?)?/i,
				submatchers: [
					{
						type: "option",
						description: "Optional",
						regex: /i/,
						groups: [1],
					},
					{
						type: "number",
						description: "턴:",
						groups: [2, 3, 4, 5],
					},
				],
			},

			{
				name: "즉사",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /instantly defeat/i,
			},

			{
				name: "필살기 턴 단축",
				targets: ["potential"],
				regex: /Cooldown Reduction/i,
			},

			{
				name: "유리 효과 해제",
				targets: ["special", "superSpecial", "swap", "support"],
				regex: /Removes all positive buffs on your team/i,
			},

			{
				name: "필살기 이중 발동",
				targets: ["potential"],
				regex: /Double Special Activation/i,
			},

			{
				name: "필살기 삼중발동",
				targets: ["potential"],
				regex: /Triple Special Activation/i,
			},

			{
				name: "베리어 관통",
				targets: ["potential"],
				regex: /Barrier Penetration/i,
			},
			{
				name: "타입 변경",
				targets: ["special", "superSpecial"],
				regex:
					/changes class [?.\d]+? of (?:all non-(?=((?:[^c."]+|c(?!har))*))\1characters?|(?=((?:[^c."]+|c(?!har))*))\2characters?) to (?=((?:[^f."]+|f(?!or))*))\3for ([?\d]+)(?:-([?\d]+))? turns?/i,
				submatchers: [
					{
						type: "number",
						description: "턴:",
						groups: [4, 5],
					},
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([3]),
				],
			},

		],
		Uncategorized: [
			/* * * * * Specials * * * * */

			/*{
            name: 'Slot fillers',
            targets: [ 'special' ],
            regex: /(Fills\b|\[EMPTY\] orbs into|Changes.+\[EMPTY\].+into)/i,
        },*/

			/*{
            name: 'Meat producers',
            targets: [ 'special' ],
            regex: /into( either)?[\s,\[\]A-Zor]+\[RCV\]/
        },

        {
            name: 'Meat converters',
            targets: [ 'special' ],
            regex: /\[RCV\].+into/i,
        },*/
			{
				name: "초월속성/타입 변환",
				targets: ["superSpecial"],
				regex: /transforms ([^."]+?) characters into Super/i,
				submatchers: [
					{
						type: "separator",
						description: "영향을 받는 속성:",
					},
					...createTypesSubmatchers([1]),
					{
						type: "separator",
						description: "영향을 받는 타입:",
					},
					...createClassesSubmatchers([1]),
				],
			},

			{
				name: "슈퍼 체인지 보유",
				targets: ["swap"],
				regex: /"super"\s*:/i,
			},

			{
				name: "선원 효과 보유",
				targets: ["sailor"],
				regex: /\S/i,
			},

			{
				name: "서포트 효과 보유",
				targets: ["support"],
				regex: /\S/i,
			},

			/* * * * * Limit Break * * * * */

			{
				name: "한계돌파 보유",
				targets: ["limit"],
				regex: /\S/i,
			},

			{
				name: "레벨 상한돌파 보유",
				targets: ["limit"],
				regex: /\^\$/i,
			},

			{
				name: "레벨 상한돌파 없음",
				targets: ["limit"],
				regex: /\^\$/i,
			},

			{
				name: "한계돌파 확장",
				targets: ["limit"],
				regex: /Locked/i,
			},

			{
				name: "한계돌파시 선장효과 강화",
				targets: ["limit"],
				regex: /Captain Ability/i,
			},

			{
				name: "잠재능력 3슬롯",
				targets: ["limit"],
				regex: /Acquire Potential 3/i,
			},

			{
				name: "잠재능력 3슬롯 미만",
				targets: ["limit"],
				regex: /^(.(?!Acquire Potential 3))*$/i,
			},

			/* * * * * Potential Abilities * * * * */

			// Leave uncategorized as per @Solaris
			{
				name: "라스트 탭",
				targets: ["potential"],
				regex: /Last Tap/i,
			},

			{
				name: "초연계기술",
				targets: ["potential"],
				regex: /Super Tandem(?! Boost)/i,
			},

			{
				name: "초연계 부스트",
				targets: ["potential"],
				regex: /Super Tandem Boost/i,
			},

			{
				name: "러쉬",
				targets: ["potential"],
				regex: /Rush/i,
			},

			/* * * * * Super Special Criteria * * * * */
			{
				name: "상단 캐릭터 한정",
				targets: ["superSpecialCriteria"],
				regex: /^This character must be captain\.?[^."]*/i,
			},
			{
				name: "모든 캐릭터",
				targets: ["superSpecialCriteria"],
				regex: /^(?!This character must be captain\.?)[^."]*/i,
			},
			{
				name: "선장 교체시",
				targets: ["superSpecialCriteria"],
				regex: /[^."]+?When character becomes [^."]+? during Captain Shift[^."]*?/i,
			},
			{
				name: "슈퍼 체인지시",
				targets: ["superSpecialCriteria"],
				regex: /[^."]+?When this character is in Combined Form from Super Swap Effect[^."]*?/i,
			},
		],
	};

	var includeOldFilters = false;
	var alphabeticalOrder = true;
	window.matchers = {};

	// declare correct order of targets here, otherwise the tags in details of units
	// will be unordered (would be based on which matchers were added first)
	var allTargets = [
		"captain",
		"special",
		"superSpecialCriteria",
		"superSpecial",
		"swap",
		"sailor",
		"limit",
		"potential",
		"support",
	];
	for (var target of allTargets) {
		window.matchers[target] = {};
	}

	/* change the structure by grouping them by their `target`. Matchers with
multiple targets will be shallow-copied. As RegExp objects and arrays are objects,
they will only be reference-copied
*/
	for (const group in matchers) {
		for (var matcher of matchers[group]) {
			for (var target of matcher.targets) {
				if (!includeOldFilters && /^old/i.test(matcher.name)) continue;
				if (!window.matchers[target]) {
					window.matchers[target] = {};
				}
				if (!window.matchers[target][group]) {
					window.matchers[target][group] = {};
				}
				var newName;
				if (target == "superSpecial") {
					newName = matcher.name.replace(/%target%/g, "super specials");
				} else {
					newName = matcher.name.replace(/%target%/g, target + "s");
				}

				// log when a matcher is overridden
				if (window.matchers[target][group][newName]) {
					console.error('Duplicate matcher "' + newName + '"');
				}

				// shallow-copy matcher so matcher objects will have different `target`'s
				var matcherCopy = {
					...matcher,
					...{ target: target, group: group, name: newName },
				};
				if (matcherCopy.submatchers) {
					matcherCopy.submatchers = [...matcherCopy.submatchers];
				}
				window.matchers[target][group][newName] = matcherCopy;
			}
		}
	}

	if (alphabeticalOrder) {
		function sortObj(obj) {
			return Object.keys(obj)
				.sort()
				.reduce(function (result, key) {
					result[key] = obj[key];
					return result;
				}, {});
		}

		for (const target in window.matchers) {
			for (const group in window.matchers[target]) {
				window.matchers[target][group] = sortObj(
					window.matchers[target][group]
				);
			}
		}
	}
})();
