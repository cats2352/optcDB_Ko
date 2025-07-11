(function($) {
	const modal = document.querySelector("#modal");
	const btn = document.querySelector("#modal-btn");
	const close = document.querySelector(".close");
 
 	/**
 		id : 메인 화면의 업데이트 리스트 번호 0부터 시작
 		title :  업데이터 정보 표시하는 팝업창의 제목
 		info : 이미지로 작업하는게 편할거 같아서 업데이트 내용이 작성된 이미지를 불러와서 출력
 		       >>> 업데이트 내용이 작성된 이미지는 dispaly/updateInfoImg 폴더에서 불러옴
 		                   따라서, 업데이트 내용 이미지를 만든 후 해당 폴더에 넣어야 정상 출력됨 
 		                   
 		**업데이트가 추가되거나 빠질 때마다 해당 index 번호에 맞춰서 updateInfo 배열을 추가/수정/삭제해줘야 함
 	*/
 	
 	const updateInfo=[
				{
					id: 0
					,title:"신규 캐릭터 캐럿 추가"
					,info: "display/updateInfoImg/ship_0001_t2.png"
				},
				{
					id: 1
					,title:"52"
					,info: "display/updateInfoImg/main_img.png"
				}
			]
 	
	$("#updateUl li").click(function(){
		var index = $(this).index();
		for( key in updateInfo){
			if(updateInfo[key].id == index){
				$("#titleModal").text(updateInfo[key].title);
				$("#infoModal").html("");
				$("#infoModal").append('<img alt="" src="'+updateInfo[key].info+'" style="position: relative; top:0; left: 0;width: 70%;margin: auto; display: block;">');
				
				break;
			}
		}
		
		modal.style.display = "block";
	});
	
	$("#closeModal").click(function(){
		$("#titleModal").text("");
		$("#infoModal").html("");
		modal.style.display = "none";
	});
	
})(jQuery);