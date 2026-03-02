    
    <div id="game_page" style="display: none;">
    
		<div id="tabs">
		    
			<ul id="tabs_menu">
			    <div id="xbworld_logo" ></div>
				<li id="map_tab"><a href="#tabs-map" title="Map / 地图"><i class="fa fa-globe" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_map">Map</span></a></li>
				<li id="civ_tab"><a href="#tabs-civ" title="Government / 政府"><i class="fa fa-university" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_gov">Government</span></a></li>
				<li id="tech_tab"><a id="tech_tab_item" href="#tabs-tec" title="Research / 科研"><i class="fa fa-flask" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_research">Research</span></a></li>
				<li id="players_tab"><a href="#tabs-nat" title="Nations / 国家"><i class="fa fa-flag" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_nations">Nations</span></a></li>
				<li id="cities_tab"><a href="#tabs-cities" title="Cities / 城市"><i class="fa fa-fort-awesome" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_cities">Cities</span></a></li>
				<li id="opt_tab"><a href="#tabs-opt" title="Options / 选项"><i class="fa fa-cogs" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_options">Options</span></a></li>
				<li id="hel_tab"><a href="#tabs-hel" title="Manual / 手册"><i class="fa fa-question-circle-o" aria-hidden="true"></i> <span class="tab-label" data-i18n="tab_manual">Manual</span></a></li>
				<li id="lang_toggle" class="lang-toggle-li"><a href="javascript:void(0)" onclick="toggleLanguage()" title="中文/EN"><i class="fa fa-language" aria-hidden="true"></i></a></li>

                <div id="game_status_panel_top"></div>

				<div id="turn_done_button_div">
            			  <button id="turn_done_button" type="button" 
					  class="button" title="Ends your turn. (Shift+Enter)" data-i18n="btn_turn_done">Turn Done</button>
                		</div>
			</ul>
			
			<div id="tabs-map" tabindex="-1">
			  <jsp:include page="canvas.jsp" flush="false"/>
			</div>
			<div id="tabs-civ">
				<jsp:include page="civilization.jsp" flush="false"/>
			</div>
			<div id="tabs-tec">
				<jsp:include page="technologies.jsp" flush="false"/>
			</div>
			<div id="tabs-nat">
				<jsp:include page="nations.jsp" flush="false"/>
			</div>
			<div id="tabs-cities">
				<jsp:include page="cities.jsp" flush="false"/>
			</div>

			<div id="tabs-hel" class="manual_doc">
			</div>
			<div id="tabs-chat">
			</div>
			<div id="tabs-opt">
				<jsp:include page="options.jsp" flush="false"/>
			</div>
			
		</div>
	</div>
      
      
    <div id="dialog" ></div>
    <div id="city_name_dialog" ></div>

<script>
var FC_I18N = {
  _lang: (navigator.language || '').startsWith('zh') ? 'zh' : 'en',
  _dict: {
    zh: {
      tab_map: '地图', tab_gov: '政府', tab_research: '科研',
      tab_nations: '国家', tab_cities: '城市', tab_options: '选项',
      tab_manual: '手册', btn_turn_done: '结束回合'
    },
    en: {
      tab_map: 'Map', tab_gov: 'Government', tab_research: 'Research',
      tab_nations: 'Nations', tab_cities: 'Cities', tab_options: 'Options',
      tab_manual: 'Manual', btn_turn_done: 'Turn Done'
    }
  },
  tr: function(key) {
    return (this._dict[this._lang] || this._dict['en'])[key] || key;
  },
  setLang: function(lang) {
    this._lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var k = el.getAttribute('data-i18n');
      el.textContent = FC_I18N.tr(k);
    });
  }
};

function toggleLanguage() {
  FC_I18N.setLang(FC_I18N._lang === 'zh' ? 'en' : 'zh');
}

if (FC_I18N._lang === 'zh') {
  document.addEventListener('DOMContentLoaded', function() {
    FC_I18N.setLang('zh');
  });
}
</script>
