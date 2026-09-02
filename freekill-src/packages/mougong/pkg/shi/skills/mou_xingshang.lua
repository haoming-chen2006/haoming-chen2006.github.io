local mouXingshang = fk.CreateSkill({
  name = "mou__xingshang",
})

Fk:loadTranslationTable{
  ["mou__xingshang"] = "行殇",
  [":mou__xingshang"] = "当一名角色受到伤害后（每回合限一次）或死亡时，则你获得两枚“颂”标记（你至多拥有9枚“颂”标记）；" ..
  "出牌阶段限两次，你可选择一名角色并移去至少一枚“颂”令其执行对应操作：2枚，复原武将牌或摸三张牌；" ..
  "3枚，回复1点体力并加1点体力上限，然后随机恢复一个已废除的装备栏（目标体力上限不大于9方可选择）；" ..
  "4枚，<a href='memorialize'>追思</a>一名已阵亡的角色（你的武将牌上有〖行殇〗时方可选择此项），"..
  "获得其武将牌上除主公技外的所有技能，然后你失去〖行殇〗、〖放逐〗、〖颂威〗。",

  ["memorialize"] = "#\"<b>追思</b>\"：被追思过的角色本局游戏不能再成为追思的目标。",
  ["#mou__xingshang"] = "放逐：你可选择一名角色，消耗一定数量的“颂”标记对其进行增益",
  ["$MouXingShang"] = "行殇",
  ["@mou__xingshang_song"] = "颂",
  ["@mou__xingshang_memorialized"] = "行殇",
  ["mou__xingshang_restore"] = "2枚：复原武将牌",
  ["mou__xingshang_draw"] = "2枚：摸三张牌",
  ["mou__xingshang_recover"] = "3枚：恢复体力与区域",
  ["mou__xingshang_memorialize"] = "4枚：追思一名已阵亡的角色",

  ["$mou__xingshang1"] = "纵是身死，仍要为我所用。",
  ["$mou__xingshang2"] = "汝九泉之下，定会感朕之情。",
}

mouXingshang:addEffect("active", {
  anim_type = "support",
  prompt = "#mou__xingshang",
  card_num = 0,
  min_target_num = 0,
  max_target_num = 1,
  interaction = function(self, player)
    local choiceList = {
      "mou__xingshang_restore",
      "mou__xingshang_draw",
      "mou__xingshang_recover",
      "mou__xingshang_memorialize",
    }
    local choices = {}
    local markValue = player:getMark("@mou__xingshang_song")
    if markValue > 1 then
      table.insertTable(choices, { choiceList[1], choiceList[2] })
    end
    if markValue > 2 then
      table.insert(choices, choiceList[3])
    end
    if markValue > 3 then
      if table.find(Fk:currentRoom().players, function(p)
        return p.dead and p.rest < 1 and not table.contains(Fk:currentRoom():getBanner("memorializedPlayers") or {}, p.id)
      end) then
        local skills = Fk.generals[player.general]:getSkillNameList()
        if player.deputyGeneral ~= "" then
          table.insertTableIfNeed(skills, Fk.generals[player.deputyGeneral]:getSkillNameList())
        end

        if table.find(skills, function(skillName) return skillName == mouXingshang.name end) then
          table.insert(choices, "mou__xingshang_memorialize")
        end
      end
    end

    return UI.ComboBox { choices = choices, all_choices = choiceList }
  end,
  times = function(self, player)
    return player.phase == Player.Play and 2 - player:usedEffectTimes(self.name, Player.HistoryPhase) or -1
  end,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) < 2 and player:getMark("@mou__xingshang_song") > 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    if #selected > 0 then
      return false
    end
    if self.interaction.data == "mou__xingshang_recover" then
      return to_select.maxHp < 10
    elseif self.interaction.data == "mou__xingshang_memorialize" then
      return false
    end

    return true
  end,
  feasible = function (self, player, selected, selected_cards, card)
    if self.interaction.data == "mou__xingshang_memorialize" then
      return #selected == 0
    else
      return #selected == 1
    end
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouXingshang.name
    local player = effect.from
    local target = effect.tos[1]

    local choice = self.interaction.data
    if choice == "mou__xingshang_restore" then
      room:removePlayerMark(player, "@mou__xingshang_song", 2)
      target:reset()
    elseif choice:startsWith("mou__xingshang_draw") then
      room:removePlayerMark(player, "@mou__xingshang_song", 2)
      target:drawCards(3, skillName)
    elseif choice == "mou__xingshang_recover" then
      room:removePlayerMark(player, "@mou__xingshang_song", 3)
      room:recover({
        who = target,
        num = 1,
        recoverBy = player,
        skillName = skillName,
      })
      if target.dead then return end
      room:changeMaxHp(target, 1)

      if not target.dead and #target.sealedSlots > 0 then
        room:resumePlayerArea(target, {room:tableRandomPick(target.sealedSlots)})
      end
    elseif choice == "mou__xingshang_memorialize" then
      room:removePlayerMark(player, "@mou__xingshang_song", 4)

      local availablePlayers = table.map(table.filter(room.players, function(p)
        return not p:isAlive() and p.rest < 1 and not table.contains(room:getBanner('memorializedPlayers') or {}, p.id)
      end), Util.IdMapper)
      local toId
      local result = room:askToCustomDialog(player, {
        skill_name = skillName,
        component = {
          url = "packages/mougong/qml/ZhuiSiBox.qml",
          prop = {
            allPlayerIds = availablePlayers,
            titleName = "$MouXingShang",
          },
        }
      })

      if result == "" then
        toId = room:tableRandomPick(availablePlayers)
      else
        toId = result.playerId
      end

      local to = room:getPlayerById(toId)
      local zhuisiPlayers = room:getBanner('memorializedPlayers') or {}
      table.insertIfNeed(zhuisiPlayers, to.id)
      room:setBanner('memorializedPlayers', zhuisiPlayers)
      local skills = Fk.generals[to.general]:getSkillNameList()
      if to.deputyGeneral ~= "" then
        table.insertTableIfNeed(skills, Fk.generals[to.deputyGeneral]:getSkillNameList())
      end
      skills = table.filter(skills, function(skill_name)
        local skill = Fk.skills[skill_name]
        local attachedKingdom = skill:getSkeleton().attached_kingdom or {}
        return not skill:hasTag(Skill.Lord) and not (#attachedKingdom > 0 and not table.contains(attachedKingdom, player.kingdom))
      end)
      if #skills > 0 then
        room:handleAddLoseSkills(player, table.concat(skills, "|"))
      end

      room:setPlayerMark(player, "@mou__xingshang_memorialized", to.deputyGeneral ~= "" and "seat#" .. to.seat or to.general)
      room:handleAddLoseSkills(player, "-" .. skillName .. '|-mou__fangzhu|-mou__songwei')
    end
  end,
})

local spec = function (self, event, target, player, data)
  player.room:addPlayerMark(player, "@mou__xingshang_song", math.min(2, 9 - player:getMark("@mou__xingshang_song")))
end

mouXingshang:addEffect(fk.Damaged, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouXingshang.name) and
      player:getMark("@mou__xingshang_song") < 9 and
      player:usedEffectTimes(self.name) < 1 and
      data.to:isAlive()
  end,
  on_cost = Util.TrueFunc,
  on_use = spec,
})

mouXingshang:addEffect(fk.Death, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouXingshang.name) and player:getMark("@mou__xingshang_song") < 9
  end,
  on_cost = Util.TrueFunc,
  on_use = spec,
})

mouXingshang:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@mou__xingshang_song", 0)
end)

return mouXingshang
