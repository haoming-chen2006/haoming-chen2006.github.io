local sigu = fk.CreateSkill {
  name = "sigu",
}

Fk:loadTranslationTable{
  ["sigu"] = "似故",
  [":sigu"] = "出牌阶段限一次，你可以令一名其他角色进行一次判定，然后对其造成两次1点伤害，期间其根据判定结果获得对应的"..
  "<a href='sigu_skills'>“受到伤害后”技能</a>。",

  ["sigu_skills"] = "A <a href=':zhichi'>智迟</a>  2 <a href=':ex__ganglie'>刚烈</a>  3 <a href=':ex__fankui'>反馈</a><br>"..
  "4 <a href=':ex__yiji'>遗计</a>  5 <a href=':ol_ex__jieming'>节命</a>  6 <a href=':fangzhu'>放逐</a><br>"..
  "7 <a href=':shibei'>矢北</a>  8 <a href=':ty_ex__chengxiang'>称象</a>  9 <a href=':zhiyu'>智愚</a><br>"..
  "10 <a href=':ty__jilei'>鸡肋</a>  J <a href=':ty__benyu'>贲育</a>  Q <a href=':chouce'>筹策</a><br>"..
  "K <a href=':wuhun'>武魂</a><br>",

  ["#sigu"] = "似故：令一名角色判定，对其造成两次1点伤害，在此期间其拥有一个“受到伤害后”技能",
}

sigu:addEffect("active", {
  anim_type = "offensive",
  prompt = "#sigu",
  audio_index = {1, 2},
  can_use = function(self, player)
    return player:usedSkillTimes(sigu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  target_num = 1,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local judge = {
      who = target,
      reason = sigu.name,
      pattern = ".|1~13",
    }
    room:judge(judge)
    if target.dead then return end
    local skill
    local index = judge.card.number
    if index > 0 and index < 14 then
      local skills = {
        "zhichi", "ex__ganglie", "ex__fankui", "ex__yiji",
        "ol_ex__jieming", "fangzhu", "shibei", "ty_ex__chengxiang",
        "zhiyu", "ty__jilei", "ty__benyu", "chouce", "wuhun"
      }
      player:broadcastSkillInvoke("sigu", index + 2)
      if not target:hasSkill(skills[index], true) then
        skill = skills[index]
        room:handleAddLoseSkills(target, skill)
      end
    end
    for _ = 1, 2 do
      if target.dead then return end
      if not player.dead then
        room:damage{
          from = player,
          to = target,
          damage = 1,
          skillName = sigu.name,
        }
      end
    end
    if skill then
      room:handleAddLoseSkills(target, "-"..skill)
    end
  end,
})

return sigu
