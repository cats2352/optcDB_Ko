(function($) {

	const alertFrom = document.querySelector("#alert");
	const alertBtn = document.querySelector("#alert-btn");
	const alertClose = document.querySelector(".close");
 
	$("#closeAlert").click(function(){
		alertFrom.style.display = "none";
	});
	
	/* 기본 검색 버튼 이벤트 */
	$("#search").click(function(){
		var name = $("#searchCharacter").val();
		
		if(name.length == 0){
			alertFrom.style.display = "block";
			$("#infoAlert").text("검색할 캐릭터 이름 또는 번호를 입력해주세요.");
			return;
		}
		
		$("#searchCharacter").val("");
		location.href = "https://cats2352.github.io/optcDB_Ko/characters/#/search/"+name;
	});
	
	/* PC 모드에서 키보드 Enter키 이벤트 */
	$("#searchCharacter").on("keyup",function(key){         
		if(key.keyCode==13) {             
			var name = $("#searchCharacter").val();
			
			if(name.length == 0){
				$("#infoAlert").text("검색할 캐릭터 이름 또는 번호를 입력해주세요.");
				alertFrom.style.display = "block";
				return;
			}
			
			var nanFlag = isNaN(name);
			if(nanFlag){
				$("#searchCharacter").val("");
				location.href = "https://cats2352.github.io/optcDB_Ko/characters/#/search/"+name;  
			}else{
				$("#searchCharacter").val("");
				location.href = "https://cats2352.github.io/optcDB_Ko/characters/#/view/"+name;  
			}
		}     
	});
	
	
})(jQuery);